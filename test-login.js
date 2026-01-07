const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'test@example.com',
            password: 'test123'
        });
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data);
        console.error('Full error:', error.message);
    }
}

testLogin();
