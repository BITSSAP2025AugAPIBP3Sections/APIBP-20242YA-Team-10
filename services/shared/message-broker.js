const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection = null;
let channel = null;

// Exchange and Queue names
const EXCHANGES = {
  EVENTS: 'streamify.events',
  ANALYTICS: 'streamify.analytics'
};

const QUEUES = {
  USER_EVENTS: 'user.events',
  VIDEO_EVENTS: 'video.events',
  BILLING_EVENTS: 'billing.events',
  ANALYTICS_EVENTS: 'analytics.events'
};

// Event types
const EVENT_TYPES = {
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  VIDEO_UPLOADED: 'video.uploaded',
  VIDEO_WATCHED: 'video.watched',
  STREAM_STARTED: 'stream.started',
  STREAM_ENDED: 'stream.ended',
  PAYMENT_PROCESSED: 'payment.processed',
  WALLET_CREDITED: 'wallet.credited'
};

// Connect to RabbitMQ
async function connect() {
  try {
    console.log('Connecting to RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Create exchanges
    await channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.ANALYTICS, 'fanout', { durable: true });

    // Create queues
    for (const queueName of Object.values(QUEUES)) {
      await channel.assertQueue(queueName, { durable: true });
    }

    // Bind queues to exchanges
    await channel.bindQueue(QUEUES.USER_EVENTS, EXCHANGES.EVENTS, 'user.*');
    await channel.bindQueue(QUEUES.VIDEO_EVENTS, EXCHANGES.EVENTS, 'video.*');
    await channel.bindQueue(QUEUES.BILLING_EVENTS, EXCHANGES.EVENTS, 'payment.*');
    await channel.bindQueue(QUEUES.BILLING_EVENTS, EXCHANGES.EVENTS, 'wallet.*');
    await channel.bindQueue(QUEUES.ANALYTICS_EVENTS, EXCHANGES.ANALYTICS, '');

    console.log('✅ RabbitMQ connected and configured');

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('⚠️  RabbitMQ connection closed. Reconnecting...');
      setTimeout(connect, 5000);
    });

    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(connect, 5000);
  }
}

// Publish an event
async function publishEvent(eventType, data) {
  if (!channel) {
    console.error('RabbitMQ channel not initialized');
    return false;
  }

  try {
    const message = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      id: generateEventId()
    };

    const routingKey = eventType;
    const exchange = EXCHANGES.EVENTS;

    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`📤 Event published: ${eventType}`);
    return true;
  } catch (error) {
    console.error('Failed to publish event:', error);
    return false;
  }
}

// Publish analytics event (fanout)
async function publishAnalyticsEvent(data) {
  if (!channel) {
    console.error('RabbitMQ channel not initialized');
    return false;
  }

  try {
    const message = {
      data,
      timestamp: new Date().toISOString(),
      id: generateEventId()
    };

    channel.publish(
      EXCHANGES.ANALYTICS,
      '',
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log('📤 Analytics event published');
    return true;
  } catch (error) {
    console.error('Failed to publish analytics event:', error);
    return false;
  }
}

// Subscribe to events
async function subscribeToQueue(queueName, handler) {
  if (!channel) {
    console.error('RabbitMQ channel not initialized');
    return;
  }

  try {
    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log(`📥 Received event from ${queueName}:`, event.eventType || 'analytics');

          await handler(event);

          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject and requeue the message
          channel.nack(msg, false, true);
        }
      }
    });

    console.log(`✅ Subscribed to queue: ${queueName}`);
  } catch (error) {
    console.error(`Failed to subscribe to queue ${queueName}:`, error);
  }
}

// Helper function to generate event ID
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Close connection
async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

module.exports = {
  connect,
  publishEvent,
  publishAnalyticsEvent,
  subscribeToQueue,
  close,
  EVENT_TYPES,
  QUEUES,
  EXCHANGES
};
