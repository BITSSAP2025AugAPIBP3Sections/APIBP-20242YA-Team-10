const axios = require('axios');

/**
 * Saga Pattern Implementation for User Registration
 * 
 * Steps:
 * 1. Create user in Auth Service
 * 2. Create wallet in Billing Service
 * 3. Create analytics profile in Analytics Service
 * 
 * If any step fails, compensating transactions rollback previous steps
 */

class RegistrationSaga {
  constructor(authServiceUrl, billingServiceUrl, analyticsServiceUrl) {
    this.authServiceUrl = authServiceUrl;
    this.billingServiceUrl = billingServiceUrl;
    this.analyticsServiceUrl = analyticsServiceUrl;
    this.sagaState = {
      userCreated: false,
      walletCreated: false,
      analyticsCreated: false,
      userId: null,
      errors: []
    };
  }

  // Step 1: Create user in Auth Service
  async createUser(userData) {
    try {
      console.log('🔄 Saga Step 1: Creating user in Auth Service...');
      const response = await axios.post(
        `${this.authServiceUrl}/api/auth/register`,
        userData,
        { timeout: 10000 }
      );

      this.sagaState.userId = response.data.user.id;
      this.sagaState.userCreated = true;
      console.log('✅ Saga Step 1: User created successfully');
      return { success: true, userId: response.data.user.id, user: response.data.user };
    } catch (error) {
      console.error('❌ Saga Step 1 Failed:', error.response?.data || error.message);
      this.sagaState.errors.push({ step: 'createUser', error: error.message });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Step 2: Create wallet in Billing Service
  async createWallet(userId) {
    try {
      console.log('🔄 Saga Step 2: Creating wallet in Billing Service...');
      const response = await axios.post(
        `${this.billingServiceUrl}/api/billing/account/create`,
        { userId },
        { timeout: 10000 }
      );

      this.sagaState.walletCreated = true;
      console.log('✅ Saga Step 2: Wallet created successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Saga Step 2 Failed:', error.response?.data || error.message);
      this.sagaState.errors.push({ step: 'createWallet', error: error.message });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Step 3: Create analytics profile in Analytics Service
  async createAnalyticsProfile(userId) {
    try {
      console.log('🔄 Saga Step 3: Creating analytics profile...');
      const response = await axios.post(
        `${this.analyticsServiceUrl}/api/analytics/profile/create`,
        { userId },
        { timeout: 10000 }
      );

      this.sagaState.analyticsCreated = true;
      console.log('✅ Saga Step 3: Analytics profile created successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Saga Step 3 Failed:', error.response?.data || error.message);
      this.sagaState.errors.push({ step: 'createAnalyticsProfile', error: error.message });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Compensating Transaction: Delete user from Auth Service
  async compensateUserCreation(userId) {
    try {
      console.log('🔄 Compensating: Deleting user from Auth Service...');
      await axios.delete(
        `${this.authServiceUrl}/api/auth/users/${userId}`,
        { timeout: 10000 }
      );
      console.log('✅ Compensation: User deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Compensation Failed (User deletion):', error.message);
      return { success: false, error: error.message };
    }
  }

  // Compensating Transaction: Delete wallet from Billing Service
  async compensateWalletCreation(userId) {
    try {
      console.log('🔄 Compensating: Deleting wallet from Billing Service...');
      await axios.delete(
        `${this.billingServiceUrl}/api/billing/account/${userId}`,
        { timeout: 10000 }
      );
      console.log('✅ Compensation: Wallet deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Compensation Failed (Wallet deletion):', error.message);
      return { success: false, error: error.message };
    }
  }

  // Execute the saga
  async execute(userData) {
    console.log('🚀 Starting Registration Saga...');

    // Step 1: Create User
    const userResult = await this.createUser(userData);
    if (!userResult.success) {
      return {
        success: false,
        error: 'Failed to create user',
        details: userResult.error
      };
    }

    const userId = userResult.userId;

    // Step 2: Create Wallet
    const walletResult = await this.createWallet(userId);
    if (!walletResult.success) {
      console.log('⚠️  Step 2 failed. Initiating rollback...');
      await this.compensateUserCreation(userId);
      return {
        success: false,
        error: 'Failed to create wallet',
        details: walletResult.error,
        rollback: 'User creation rolled back'
      };
    }

    // Step 3: Create Analytics Profile
    const analyticsResult = await this.createAnalyticsProfile(userId);
    if (!analyticsResult.success) {
      console.log('⚠️  Step 3 failed. Initiating rollback...');
      await this.compensateWalletCreation(userId);
      await this.compensateUserCreation(userId);
      return {
        success: false,
        error: 'Failed to create analytics profile',
        details: analyticsResult.error,
        rollback: 'User and wallet creation rolled back'
      };
    }

    console.log('✅ Registration Saga completed successfully!');
    return {
      success: true,
      message: 'User registered successfully with wallet and analytics profile',
      user: userResult.user,
      sagaState: this.sagaState
    };
  }

  // Get current saga state
  getState() {
    return this.sagaState;
  }
}

module.exports = { RegistrationSaga };
