#!/bin/bash
set -e

NAMESPACE=streamify

echo "=== 1. Creating namespace ==="
kubectl create ns $NAMESPACE || echo "Namespace $NAMESPACE already exists"

echo "=== 2. Applying secrets ==="
kubectl apply -f k8s/postgres/postgres-secrets.yaml -n $NAMESPACE

echo "=== 3. Applying PVs / PVCs ==="
kubectl apply -f k8s/pv-pvc-video-uploads.yaml -n $NAMESPACE

echo "=== 4. Deploying Postgres databases ==="
kubectl apply -f k8s/postgres/postgres-auth.yaml -n $NAMESPACE
kubectl apply -f k8s/postgres/postgres-analytics.yaml -n $NAMESPACE
kubectl apply -f k8s/postgres/postgres-billing.yaml -n $NAMESPACE
kubectl apply -f k8s/postgres/postgres-streaming.yaml -n $NAMESPACE
kubectl apply -f k8s/postgres/postgres-video.yaml -n $NAMESPACE

echo "Waiting for Postgres pods to be ready..."
for POD in postgres-auth postgres-analytics postgres-billing postgres-streaming postgres-video; do
    kubectl wait --for=condition=Ready pod -l app=$POD -n $NAMESPACE --timeout=120s
done

echo "=== 5. Deploying microservices ==="
SERVICES=(
  "auth"
  "analytics"
  "billing"
  "streaming"
  "video"
  "api-gateway"
)

for SERVICE in "${SERVICES[@]}"; do
    echo "Deploying $SERVICE-service..."
    kubectl apply -f k8s/services/${SERVICE}-deployment.yaml -n $NAMESPACE
    kubectl apply -f k8s/services/${SERVICE}-service.yaml -n $NAMESPACE
done

echo "Waiting for microservices to be ready..."
for SERVICE in "${SERVICES[@]}"; do
    kubectl wait --for=condition=Ready pod -l app=${SERVICE}-service -n $NAMESPACE --timeout=120s || echo "$SERVICE may not be ready yet"
done

echo "=== 6. List all pods ==="
kubectl get pods -n $NAMESPACE

echo "=== 7. Access URLs (via minikube tunnel) ==="
for SERVICE in "${SERVICES[@]}"; do
    echo "Service: $SERVICE"
    minikube service ${SERVICE}-service -n $NAMESPACE --url
done

echo "=== Deployment Complete ==="
