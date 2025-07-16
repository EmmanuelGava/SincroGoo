// Simple test script to verify API endpoints are working
// Run with: node test-api-endpoints.js

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint}: ${response.status}`);
    if (!response.ok) {
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }
    return { status: response.status, data };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing API endpoints...\n');
  
  // Test estados_lead endpoint
  await testEndpoint('/api/supabase/estados_lead');
  
  // Test leads endpoint
  await testEndpoint('/api/supabase/leads');
  
  // Test conversaciones entrantes endpoint
  await testEndpoint('/api/crm/conversaciones/entrantes');
  
  // Test chat conversaciones endpoint
  await testEndpoint('/api/chat/conversaciones');
  
  console.log('\n✨ Test completed!');
}

runTests();