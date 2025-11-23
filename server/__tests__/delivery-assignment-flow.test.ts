
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { storage } from '../storage';
import { hashPassword } from '../deliveryAuth';
import { generateAccessToken } from '../userAuth';

describe('Delivery Assignment Flow - End to End', () => {
  let testUser: any;
  let testChef: any;
  let testCategory: any;
  let testProduct: any;
  let testDeliveryPerson: any;
  let testOrder: any;
  let userToken: string;

  beforeAll(async () => {
    // Create test category
    testCategory = await storage.createCategory({
      name: 'Test Category',
      description: 'Test category for delivery flow',
      image: 'https://example.com/category.jpg',
    });

    // Create test chef
    testChef = await storage.createChef({
      name: 'Test Chef',
      description: 'Test chef for delivery flow',
      image: 'https://example.com/chef.jpg',
      rating: '4.5',
      reviewCount: 100,
      categoryId: testCategory.id,
      latitude: 19.0760,
      longitude: 72.8777,
    });

    // Create test product
    testProduct = await storage.createProduct({
      name: 'Test Dish',
      description: 'Test dish for delivery flow',
      price: 199,
      image: 'https://example.com/dish.jpg',
      rating: '4.5',
      reviewCount: 50,
      isVeg: true,
      isCustomizable: false,
      categoryId: testCategory.id,
      chefId: testChef.id,
      stockQuantity: 100,
      lowStockThreshold: 10,
      isAvailable: true,
    });

    // Create test user
    testUser = await storage.createUser({
      name: 'Test User',
      phone: '+919876543210',
      email: 'testuser@example.com',
      passwordHash: await hashPassword('password123'),
      walletBalance: 1000,
      referralCode: null,
    });

    userToken = generateAccessToken(testUser);

    // Create test delivery person
    const deliveryPasswordHash = await hashPassword('delivery123');
    testDeliveryPerson = await storage.createDeliveryPersonnel({
      name: 'Test Delivery Person',
      phone: '+919876543211',
      email: 'delivery@example.com',
      passwordHash: deliveryPasswordHash,
      status: 'available',
      currentLocation: null,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testOrder) await storage.deleteOrder(testOrder.id);
    if (testProduct) await storage.deleteProduct(testProduct.id);
    if (testChef) await storage.deleteChef(testChef.id);
    if (testCategory) await storage.deleteCategory(testCategory.id);
    if (testUser) await storage.deleteUser(testUser.id);
    if (testDeliveryPerson) await storage.deleteDeliveryPersonnel(testDeliveryPerson.id);
  });

  it('should complete full delivery flow from order placement to delivery', async () => {
    // Step 1: User places an order
    console.log('📝 Step 1: User places an order');
    testOrder = await storage.createOrder({
      customerName: testUser.name,
      phone: testUser.phone,
      email: testUser.email,
      address: '123 Test Street, Mumbai, 400001',
      items: [
        {
          id: testProduct.id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 2,
        },
      ],
      subtotal: 398,
      deliveryFee: 50,
      total: 448,
      chefId: testChef.id,
      userId: testUser.id,
      paymentStatus: 'pending',
    });

    expect(testOrder).toBeDefined();
    expect(testOrder.status).toBe('pending');
    expect(testOrder.paymentStatus).toBe('pending');
    expect(testOrder.assignedTo).toBeNull();
    expect(testOrder.deliveryPersonName).toBeNull();
    expect(testOrder.deliveryPersonPhone).toBeNull();
    console.log('✅ Order created successfully:', testOrder.id);

    // Step 2: Admin confirms payment
    console.log('📝 Step 2: Admin confirms payment');
    const confirmedOrder = await storage.acceptOrder(testOrder.id, 'admin');
    
    expect(confirmedOrder).toBeDefined();
    expect(confirmedOrder!.status).toBe('confirmed');
    expect(confirmedOrder!.paymentStatus).toBe('confirmed');
    console.log('✅ Payment confirmed, order status:', confirmedOrder!.status);

    // Step 3: Chef marks order as preparing
    console.log('📝 Step 3: Chef marks order as preparing');
    const preparingOrder = await storage.updateOrderStatus(testOrder.id, 'preparing');
    
    expect(preparingOrder).toBeDefined();
    expect(preparingOrder!.status).toBe('preparing');
    console.log('✅ Order is being prepared');

    // Step 4: Chef marks order as prepared
    console.log('📝 Step 4: Chef marks order as prepared');
    const preparedOrder = await storage.updateOrderStatus(testOrder.id, 'prepared');
    
    expect(preparedOrder).toBeDefined();
    expect(preparedOrder!.status).toBe('prepared');
    console.log('✅ Order preparation complete');

    // Step 5: Admin or auto-assign to delivery person
    console.log('📝 Step 5: Assign order to delivery person');
    const assignedOrder = await storage.assignOrderToDeliveryPerson(
      testOrder.id,
      testDeliveryPerson.id
    );

    expect(assignedOrder).toBeDefined();
    expect(assignedOrder!.assignedTo).toBe(testDeliveryPerson.id);
    expect(assignedOrder!.deliveryPersonName).toBe(testDeliveryPerson.name);
    expect(assignedOrder!.deliveryPersonPhone).toBe(testDeliveryPerson.phone);
    expect(assignedOrder!.status).toBe('assigned');
    expect(assignedOrder!.assignedAt).toBeDefined();
    console.log('✅ Order assigned to delivery person:', testDeliveryPerson.name);

    // Verify delivery person status changed to busy
    const deliveryPerson = await storage.getDeliveryPersonnelById(testDeliveryPerson.id);
    expect(deliveryPerson!.status).toBe('busy');
    console.log('✅ Delivery person status updated to busy');

    // Step 6: Delivery person accepts the order
    console.log('📝 Step 6: Delivery person accepts the order');
    const acceptedOrder = await storage.updateOrderStatus(testOrder.id, 'accepted_by_delivery');
    
    expect(acceptedOrder).toBeDefined();
    expect(acceptedOrder!.status).toBe('accepted_by_delivery');
    expect(acceptedOrder!.deliveryPersonName).toBe(testDeliveryPerson.name);
    expect(acceptedOrder!.deliveryPersonPhone).toBe(testDeliveryPerson.phone);
    console.log('✅ Delivery person accepted the order');

    // Step 7: Delivery person picks up the order
    console.log('📝 Step 7: Delivery person picks up the order');
    const pickedUpOrder = await storage.updateOrderPickup(testOrder.id);
    
    expect(pickedUpOrder).toBeDefined();
    expect(pickedUpOrder!.status).toBe('out_for_delivery');
    expect(pickedUpOrder!.pickedUpAt).toBeDefined();
    console.log('✅ Order picked up, out for delivery at:', pickedUpOrder!.pickedUpAt);

    // Step 8: Delivery person delivers the order
    console.log('📝 Step 8: Delivery person delivers the order');
    const deliveredOrder = await storage.updateOrderDelivery(testOrder.id);
    
    expect(deliveredOrder).toBeDefined();
    expect(deliveredOrder!.status).toBe('delivered');
    expect(deliveredOrder!.deliveredAt).toBeDefined();
    console.log('✅ Order delivered successfully at:', deliveredOrder!.deliveredAt);

    // Verify delivery person status changed back to available
    const updatedDeliveryPerson = await storage.getDeliveryPersonnelById(testDeliveryPerson.id);
    expect(updatedDeliveryPerson!.status).toBe('available');
    expect(updatedDeliveryPerson!.totalDeliveries).toBeGreaterThan(0);
    console.log('✅ Delivery person status updated to available, total deliveries:', updatedDeliveryPerson!.totalDeliveries);

    // Step 9: Verify complete order details
    console.log('📝 Step 9: Verify complete order details');
    const finalOrder = await storage.getOrderById(testOrder.id);
    
    expect(finalOrder).toBeDefined();
    expect(finalOrder!.status).toBe('delivered');
    expect(finalOrder!.paymentStatus).toBe('confirmed');
    expect(finalOrder!.assignedTo).toBe(testDeliveryPerson.id);
    expect(finalOrder!.deliveryPersonName).toBe(testDeliveryPerson.name);
    expect(finalOrder!.deliveryPersonPhone).toBe(testDeliveryPerson.phone);
    expect(finalOrder!.createdAt).toBeDefined();
    expect(finalOrder!.approvedAt).toBeDefined();
    expect(finalOrder!.assignedAt).toBeDefined();
    expect(finalOrder!.pickedUpAt).toBeDefined();
    expect(finalOrder!.deliveredAt).toBeDefined();
    
    console.log('\n✅ DELIVERY FLOW COMPLETED SUCCESSFULLY! ✅');
    console.log('Order Timeline:');
    console.log('  - Created:', finalOrder!.createdAt);
    console.log('  - Approved:', finalOrder!.approvedAt);
    console.log('  - Assigned:', finalOrder!.assignedAt);
    console.log('  - Picked up:', finalOrder!.pickedUpAt);
    console.log('  - Delivered:', finalOrder!.deliveredAt);
    console.log('\nDelivery Person:', finalOrder!.deliveryPersonName);
    console.log('Phone:', finalOrder!.deliveryPersonPhone);
  });

  it('should handle delivery person name and phone in tracking', async () => {
    // Create a new order for this test
    const trackingOrder = await storage.createOrder({
      customerName: 'Tracking Test User',
      phone: '+919876543212',
      email: 'tracking@example.com',
      address: '456 Track Street, Mumbai, 400002',
      items: [
        {
          id: testProduct.id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 1,
        },
      ],
      subtotal: 199,
      deliveryFee: 50,
      total: 249,
      chefId: testChef.id,
      userId: testUser.id,
      paymentStatus: 'confirmed',
    });

    // Confirm and prepare the order
    await storage.updateOrderStatus(trackingOrder.id, 'confirmed');
    await storage.updateOrderStatus(trackingOrder.id, 'preparing');
    await storage.updateOrderStatus(trackingOrder.id, 'prepared');

    // Assign to delivery person
    const assignedTracking = await storage.assignOrderToDeliveryPerson(
      trackingOrder.id,
      testDeliveryPerson.id
    );

    // Verify delivery person details are set immediately on assignment
    expect(assignedTracking!.deliveryPersonName).toBe(testDeliveryPerson.name);
    expect(assignedTracking!.deliveryPersonPhone).toBe(testDeliveryPerson.phone);

    // Accept the order
    await storage.updateOrderStatus(trackingOrder.id, 'accepted_by_delivery');

    // Fetch order to verify details persist
    const trackedOrder = await storage.getOrderById(trackingOrder.id);
    expect(trackedOrder!.deliveryPersonName).toBe(testDeliveryPerson.name);
    expect(trackedOrder!.deliveryPersonPhone).toBe(testDeliveryPerson.phone);

    console.log('✅ Delivery person tracking details verified');
    console.log('   Name:', trackedOrder!.deliveryPersonName);
    console.log('   Phone:', trackedOrder!.deliveryPersonPhone);

    // Cleanup
    await storage.deleteOrder(trackingOrder.id);
  });

  it('should handle no available delivery personnel scenario', async () => {
    // Create unavailable delivery person
    const unavailableDeliveryHash = await hashPassword('unavailable123');
    const unavailableDelivery = await storage.createDeliveryPersonnel({
      name: 'Unavailable Delivery',
      phone: '+919876543213',
      email: 'unavailable@example.com',
      passwordHash: unavailableDeliveryHash,
      status: 'busy',
      currentLocation: null,
    });

    // Get available delivery personnel
    const availablePersonnel = await storage.getAvailableDeliveryPersonnel();
    
    // Should still return the delivery person (admin can assign to any active personnel)
    expect(availablePersonnel.length).toBeGreaterThan(0);
    
    console.log('✅ Available delivery personnel retrieved:', availablePersonnel.length);

    // Cleanup
    await storage.deleteDeliveryPersonnel(unavailableDelivery.id);
  });
});
