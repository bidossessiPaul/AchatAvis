import axios from 'axios';

async function test() {
    try {
        console.log('Testing backend live...');
        const response = await axios.get('http://localhost:5000/api/test-route');
        console.log('Response:', JSON.stringify(response.data));
    } catch (error: any) {
        console.error('Error connecting to backend:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

test();
