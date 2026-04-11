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

	const placeDetailsSection = document.getElementById('place-details');
	if (placeDetailsSection) {
		const placeId = getPlaceIdFromURL();
		if (placeId) {
			checkPlaceAuthentication(placeId);
		} else {
			placeDetailsSection.innerHTML = '<p>Place ID not found in URL!</p>';
		}
	}
});

function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return null;
}

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
		alert('Server is offline!');
	}
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
		if (token) headers['Authorization'] = `Bearer ${token}`;
		const response = await fetch('http://127.0.0.1:5000/api/v1/places', { headers });
		if (response.ok) {
			const places = await response.json();
			displayPlaces(places);
		}
	} catch (error) {
		console.error('Error:', error);
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
			if (selectedPrice === 'All' || placePrice <= parseFloat(selectedPrice)) {
				card.style.display = 'block';
			} else {
				card.style.display = 'none';
			}
		});
	});
}

function getPlaceIdFromURL() {
	const params = new URLSearchParams(window.location.search);
	return params.get('id');
}

function checkPlaceAuthentication(placeId) {
	const token = getCookie('token');
	const loginLink = document.getElementById('login-link');
	const addReviewSection = document.getElementById('add-review');

	if (!token) {
		if (loginLink) loginLink.style.display = 'block';
		if (addReviewSection) addReviewSection.style.display = 'none';
	} else {
		if (loginLink) loginLink.style.display = 'none';
		if (addReviewSection) addReviewSection.style.display = 'block';
	}

	fetchPlaceDetails(token, placeId);
}

async function fetchPlaceDetails(token, placeId) {
	try {
		const headers = {};
		if (token) headers['Authorization'] = `Bearer ${token}`;

		const response = await fetch(`http://127.0.0.1:5000/api/v1/places/${placeId}`, { headers });
		if (response.ok) {
			const place = await response.json();
			displayPlaceDetails(place);
		} else {
			document.getElementById('place-details').innerHTML = '<p>Place not found!</p>';
		}
	} catch (error) {
		console.error('Error fetching details:', error);
	}
}

function displayPlaceDetails(place) {
	const placeDetails = document.getElementById('place-details');
	const reviewsList = document.getElementById('reviews-list');

	let amenitiesHTML = '<li>No amenities listed</li>';
	if (place.amenities && place.amenities.length > 0) {
		amenitiesHTML = place.amenities.map(a => `<li>${a.name}</li>`).join('');
	}

	placeDetails.innerHTML = `
        <h1>${place.title}</h1>
        <div class="place-info">
            <p><strong>Host:</strong> ${place.owner_id}</p>
            <p><strong>Price:</strong> <span class="price">$${place.price} / night</span></p>
            <p><strong>Description:</strong> ${place.description || 'No description available.'}</p>
            <h3>Amenities</h3>
            <ul>${amenitiesHTML}</ul>
        </div>
    `;

	reviewsList.innerHTML = '';
	if (place.reviews && place.reviews.length > 0) {
		place.reviews.forEach(review => {
			const article = document.createElement('article');
			article.className = 'review-card';
			article.innerHTML = `
                <p><strong>User:</strong> "${review.text}"</p>
                <p><em>Rating: ${review.rating}/5</em></p>
            `;
			reviewsList.appendChild(article);
		});
	} else {
		reviewsList.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
	}
}