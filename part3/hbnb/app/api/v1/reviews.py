from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('reviews', description='Review operations')


review_model = api.model('Review', {
    'text': fields.String(required=True),
    'rating': fields.Integer(required=True),
    'place_id': fields.String(required=True)
})


@api.route('/')
class ReviewList(Resource):

    @jwt_required()
    @api.expect(review_model)
    def post(self):

        data = request.json
        data["user_id"] = get_jwt_identity()

        try:
            review = facade.create_review(data)
            return review.to_dict(), 201
        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


    def get(self):

        reviews = facade.get_all_reviews()
        return [r.to_dict() for r in reviews], 200


@api.route('/<string:review_id>')
class ReviewResource(Resource):

    def get(self, review_id):

        review = facade.get_review(review_id)

        if not review:
            api.abort(404, "Review not found")

        return review.to_dict(), 200


    @jwt_required()
    def put(self, review_id):

        review = facade.get_review(review_id)

        if not review:
            api.abort(404, "Review not found")

        if review.user.id != get_jwt_identity():
            api.abort(403, "You can only modify your own review")

        review = facade.update_review(review_id, request.json)

        return review.to_dict(), 200


    @jwt_required()
    def delete(self, review_id):

        review = facade.get_review(review_id)

        if not review:
            api.abort(404, "Review not found")

        if review.user.id != get_jwt_identity():
            api.abort(403, "You can only delete your own review")

        facade.delete_review(review_id)

        return {"message": "Review deleted successfully"}, 200