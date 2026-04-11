document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await loginUser(email, password);
        });
    }

    const placesList = document.getElementById('places-list');
    if (placesList) {
        checkAuthentication();
        setupFilter();
    }
});

async function loginUser(email, password) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            document.cookie = `token=${data.access_token}; path=/`;
            window.location.href = 'index.html';
        } else {
            const errorData = await response.json();
            alert('Login failed: ' + (errorData.message || 'Invalid credentials'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server is offline!');
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function checkAuthentication() {
    const token = getCookie('token');
    const loginLink = document.getElementById('login-link');

    if (!token) {
        loginLink.style.display = 'block'; 
    } else {
        loginLink.style.display = 'none'; 
    }
    
    fetchPlaces(token);
}

async function fetchPlaces(token) {
    try {
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('http://127.0.0.1:5000/api/v1/places', {
            headers: headers
        });

        if (response.ok) {
            const places = await response.json();
            displayPlaces(places);
        } else {
            console.error('Failed to fetch places');
        }
    } catch (error) {
        console.error('Error fetching places:', error);
    }
}

function displayPlaces(places) {
    const placesList = document.getElementById('places-list');
    placesList.innerHTML = ''; 

    places.forEach(place => {
        const article = document.createElement('article');
        article.className = 'place-card';
        article.dataset.price = place.price;

        article.innerHTML = `
            <h2>${place.title}</h2>
            <p class="price">$${place.price} / night</p>
            <p>${place.description || 'No description available.'}</p>
            <a href="place.html?id=${place.id}" class="details-button">View Details</a>
        `;
        placesList.appendChild(article);
    });
}

function setupFilter() {
    const filter = document.getElementById('price-filter');
    filter.addEventListener('change', (event) => {
        const selectedPrice = event.target.value;
        const placeCards = document.querySelectorAll('.place-card');

        placeCards.forEach(card => {
            const placePrice = parseFloat(card.dataset.price);
            
            if (selectedPrice === 'All') {
                card.style.display = 'block';
            } else {
                if (placePrice <= parseFloat(selectedPrice)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });
}