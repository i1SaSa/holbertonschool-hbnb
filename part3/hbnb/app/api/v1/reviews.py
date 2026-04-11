from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from app.services.facade import HBnBFacade

api = Namespace('reviews', description='Review operations')
facade = HBnBFacade()

# Models
review_model = api.model('Review', {
    'id': fields.String(readonly=True),
    'text': fields.String(required=True),
    'rating': fields.Integer(required=True),
    'user_id': fields.String(required=True),
    'place_id': fields.String(required=True),
    'created_at': fields.DateTime,
    'updated_at': fields.DateTime
})

review_create_model = api.model('ReviewCreate', {
    'text': fields.String(required=True),
    'rating': fields.Integer(required=True),
    'place_id': fields.String(required=True)
})


@api.route('/')
class ReviewList(Resource):
    @jwt_required()
    @api.expect(review_create_model)
    def post(self):
        """Create a new review"""
        data = request.json
        data["user_id"] = get_jwt_identity()

        success, result = facade.create_review(data)
        if success:
            return result.to_dict(), 201
        api.abort(400, result)

    def get(self):
        """Get all reviews"""
        reviews = facade.get_all_reviews()
        return [r.to_dict() for r in reviews], 200


@api.route('/<string:review_id>')
class ReviewResource(Resource):
    def get(self, review_id):
        """Get review by ID"""
        review = facade.get_review(review_id)
        if not review:
            api.abort(404, "Review not found")
        return review.to_dict(), 200

    @jwt_required()
    def put(self, review_id):
        """Update review"""
        review = facade.get_review(review_id)
        if not review:
            api.abort(404, "Review not found")

        current_user_id = get_jwt_identity()
        current_user_claims = get_jwt()

        if review.user_id != current_user_id and not current_user_claims.get('is_admin'):
            api.abort(
                403, "You can only modify your own review unless you are an admin")
        success, result = facade.update_review(review_id, request.json)
        if success:
            return result.to_dict(), 200
        api.abort(400, result)

    @jwt_required()
    def delete(self, review_id):
        """Delete review"""
        review = facade.get_review(review_id)
        if not review:
            api.abort(404, "Review not found")

        if review.user_id != get_jwt_identity():
            api.abort(403, "You can only delete your own review")

        success, result = facade.delete_review(review_id)
        if success:
            return {"message": "Review deleted successfully"}, 200
        api.abort(400, result)
