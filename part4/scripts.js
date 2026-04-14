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
		}
	}

	const addReviewForm = document.getElementById('review-form');
	if (addReviewForm && window.location.pathname.includes('add_review.html')) {
		const token = checkAuthenticationForReview();
		const placeId = getPlaceIdFromURL();

		addReviewForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const reviewText = document.getElementById('review').value;
			const rating = document.getElementById('rating').value;

			await submitReview(token, placeId, reviewText, rating);
		});
	}
});

function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return null;
}

function getPlaceIdFromURL() {
	const params = new URLSearchParams(window.location.search);
	return params.get('id');
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
			alert('Login failed!');
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

function checkAuthentication() {
	const token = getCookie('token');
	const loginLink = document.getElementById('login-link');
	const signupLink = document.getElementById('signup-link');
	const addPlaceBtn = document.getElementById('add-place-btn');

	if (!token && loginLink) loginLink.style.display = 'block';
	else if (token && loginLink) loginLink.style.display = 'none';
	fetchPlaces(token);

	if (!token) {
		if (loginLink) loginLink.style.display = 'inline-block';
		if (signupLink) signupLink.style.display = 'inline-block';
		if (addPlaceBtn) addPlaceBtn.style.display = 'none';
	} else {
		if (loginLink) loginLink.style.display = 'none';
		if (signupLink) signupLink.style.display = 'none';
		if (addPlaceBtn) addPlaceBtn.style.display = 'inline-block';
	}
}

async function fetchPlaces(token) {
	try {
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		const response = await fetch('http://127.0.0.1:5000/api/v1/places/', { headers });
		if (response.ok) {
			const places = await response.json();
			displayPlaces(places);
		}
	} catch (error) { console.error('Error:', error); }
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
            <p>${place.description || 'No description'}</p>
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
			} else { card.style.display = 'none'; }
		});
	});
}

function checkPlaceAuthentication(placeId) {
	const token = getCookie('token');
	fetchPlaceDetails(token, placeId);
}

async function fetchPlaceDetails(token, placeId) {
	try {
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		const response = await fetch(`http://127.0.0.1:5000/api/v1/places/${placeId}`, { headers });
		if (response.ok) {
			const place = await response.json();
			const placeDetails = document.getElementById('place-details');
			placeDetails.innerHTML = `
                <h1>${place.title}</h1>
                <p><strong>Price:</strong> <span class="price">$${place.price} / night</span></p>
                <p>${place.description}</p>
            `;
			if (token) {
				placeDetails.innerHTML += `<br><a href="add_review.html?id=${place.id}" class="login-button">Add Review</a>`;
			}
		}
	} catch (error) { console.error('Error:', error); }
}

function checkAuthenticationForReview() {
	const token = getCookie('token');
	if (!token) {
		window.location.href = 'index.html';
	}
	return token;
}

async function submitReview(token, placeId, reviewText, rating) {
	try {
		const response = await fetch(`http://127.0.0.1:5000/api/v1/reviews/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				text: reviewText,
				rating: parseInt(rating),
				place_id: placeId
			})
		});

		if (response.ok) {
			alert('Review submitted successfully! 🎉');
			window.location.href = `place.html?id=${placeId}`;
		} else {
			const errorData = await response.json();
			alert('Failed to submit review: ' + (errorData.message || 'Error'));
		}
	} catch (error) {
		console.error('Error:', error);
		alert('Server is offline!');
	}
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
	signupForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const firstName = document.getElementById('first_name').value;
		const lastName = document.getElementById('last_name').value;
		const email = document.getElementById('signup_email').value;
		const password = document.getElementById('signup_password').value;

		try {
			const response = await fetch('http://127.0.0.1:5000/api/v1/users/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: firstName,
					last_name: lastName,
					email: email,
					password: password
				})
			});

			if (response.ok) {
				alert('Account created successfully! Please login.');
				window.location.href = 'login.html';
			} else {
				const errorData = await response.json();
				alert('Signup failed: ' + (errorData.message || 'Email may exist'));
			}
		} catch (error) { console.error('Error:', error); }
	});
}

const addPlaceForm = document.getElementById('add-place-form');
if (addPlaceForm) {
	const token = getCookie('token');
	if (!token) window.location.href = 'login.html';

	addPlaceForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const selectedAmenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
			.map(checkbox => checkbox.value);

		const placeData = {
			title: document.getElementById('title').value,
			description: document.getElementById('description').value,
			price: parseFloat(document.getElementById('price').value),
			latitude: parseFloat(document.getElementById('lat').value),
			longitude: parseFloat(document.getElementById('lng').value),
			amenities: selectedAmenities
		};

		try {
			const response = await fetch('http://127.0.0.1:5000/api/v1/places/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(placeData)
			});

			if (response.status === 201 || response.ok) {
				alert('Place created successfully! 🏘️');
				window.location.href = 'index.html';
			} else {
				const errorData = await response.json();
				alert('Failed to create place: ' + (errorData.message || 'Unauthorized'));
			}
		} catch (error) { console.error('Error:', error); }
	});
}