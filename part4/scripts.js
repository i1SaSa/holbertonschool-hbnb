document.addEventListener('DOMContentLoaded', () => {
	updateHeaderButtons();

	const token = getCookie('token');

	const placesList = document.getElementById('places-list');
	if (placesList) {
		fetchPlaces(token);
		setupFilter();
	}

	const placeDetailsSection = document.getElementById('place-details');
	if (placeDetailsSection) {
		const placeId = getPlaceIdFromURL();
		if (placeId) {
			fetchPlaceDetails(token, placeId);
		}
	}

	const loginForm = document.getElementById('login-form');
	if (loginForm) {
		loginForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			await loginUser(email, password);
		});
	}

	const addReviewForm = document.getElementById('review-form');
	if (addReviewForm && window.location.pathname.includes('add_review.html')) {
		const reviewToken = checkAuthenticationForReview();
		const placeId = getPlaceIdFromURL();

		addReviewForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const reviewText = document.getElementById('review').value;
			const rating = document.getElementById('rating').value;
			await submitReview(reviewToken, placeId, reviewText, rating);
		});
	}
});

function updateHeaderButtons() {
	const token = getCookie('token');
	const loginLink = document.getElementById('login-link');
	const signupLink = document.getElementById('signup-link');
	const addPlaceBtn = document.getElementById('add-place-btn');
	const logoutBtn = document.getElementById('logout-btn');

	if (!token) {
		if (loginLink) loginLink.style.display = 'inline-block';
		if (signupLink) signupLink.style.display = 'inline-block';
		if (addPlaceBtn) addPlaceBtn.style.display = 'none';
		if (logoutBtn) logoutBtn.style.display = 'none';
	} else {
		if (loginLink) loginLink.style.display = 'none';
		if (signupLink) signupLink.style.display = 'none';
		if (addPlaceBtn) addPlaceBtn.style.display = 'inline-block';
		if (logoutBtn) logoutBtn.style.display = 'inline-block';
	}
}

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

		if (!response.ok) throw new Error('Failed to fetch data');

		const place = await response.json();

		let userId = null;
		let isAdmin = false;
		if (token) {
			const payload = getPayload(token);
			if (payload) {
				userId = payload.sub || payload.user_id;
				isAdmin = payload.is_admin || false;
			}
		}

		const placeDetails = document.getElementById('place-details');
		placeDetails.innerHTML = `
            <h1>${place.title}</h1>
            <p><strong>Price:</strong> <span class="price">$${place.price} / night</span></p>
            <p>${place.description}</p>
        `;

		if (token) {
			placeDetails.innerHTML += `<br><a href="add_review.html?id=${place.id}" class="login-button" style="display:inline-block; margin-top:15px;">Add Review</a>`;
		}

		const reviewsList = document.getElementById('reviews-list');
		if (reviewsList) {
			reviewsList.innerHTML = '';
			if (place.reviews && place.reviews.length > 0) {
				place.reviews.forEach(review => {

					const canDeleteReview = isAdmin || (userId && userId == review.user_id);

					const reviewHtml = `
                        <div class="review-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #f9f9f9; width: 100%;">
                            <p style="margin: 0;"><strong>Rating:</strong> ${'⭐'.repeat(review.rating)}</p>
                            <p style="margin: 10px 0 0 0; color: #555;">${review.text}</p>
                            ${canDeleteReview ? `<button onclick="deleteReview('${review.id}', '${place.id}')" style="color:#dc3545; background:none; border:none; cursor:pointer; margin-top:10px; font-weight:bold;">Delete Review ❌</button>` : ''}
                        </div>
                    `;
					reviewsList.innerHTML += reviewHtml;
				});
			} else {
				reviewsList.innerHTML = '<p style="color: #888;">No reviews yet. Be the first to rate this place!</p>';
			}
		}

	} catch (error) {
		console.error('Error fetching place details:', error);
		document.getElementById('place-details').innerHTML = '<p style="color:red; font-weight:bold;">Error loading place details.</p>';
	}
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
			alert('Review submitted successfully! ');
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
				alert('Place created successfully! ');
				window.location.href = 'index.html';
			} else {
				const errorData = await response.json();
				alert('Failed to create place: ' + (errorData.message || 'Unauthorized'));
			}
		} catch (error) { console.error('Error:', error); }
	});
}
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
	logoutBtn.addEventListener('click', () => {
		document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

		alert('Logged out successfully! ');
		window.location.reload();
	});
}
function getPayload(token) {
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split('.')[1]));
	} catch (e) {
		return null;
	}
}



async function deleteReview(reviewId, placeId) {
	if (!confirm("Are you sure you want to delete this review?")) return;

	const token = getCookie('token');
	try {
		const response = await fetch(`http://127.0.0.1:5000/api/v1/reviews/${reviewId}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.ok || response.status === 204 || response.status === 200) {
			alert("Review deleted successfully! 🗑️");
			location.reload();
		} else {
			alert("Failed to delete review.");
		}
	} catch (error) {
		console.error('Error deleting review:', error);
		alert("Server is offline! Can't delete review.");
	}
}