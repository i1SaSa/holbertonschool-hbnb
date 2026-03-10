from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('places', description='Place operations')


place_model = api.model('Place', {
    'title': fields.String(required=True),
    'description': fields.String,
    'price': fields.Float(required=True),
    'latitude': fields.Float(required=True),
    'longitude': fields.Float(required=True),
    'amenities': fields.List(fields.String)
})


@api.route('/')
class PlaceList(Resource):

    @jwt_required()
    @api.expect(place_model)
    def post(self):

        data = request.json
        data["owner_id"] = get_jwt_identity()

        try:
            place = facade.create_place(data)
            return place.to_dict(), 201
        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


    def get(self):

        places = facade.get_all_places()
        return [p.to_dict() for p in places], 200


@api.route('/<string:place_id>')
class PlaceResource(Resource):

    def get(self, place_id):

        place = facade.get_place(place_id)

        if not place:
            api.abort(404, "Place not found")

        return place.to_dict(), 200


    @jwt_required()
    def put(self, place_id):

        place = facade.get_place(place_id)

        if not place:
            api.abort(404, "Place not found")

        user_id = get_jwt_identity()

        if place.owner.id != user_id:
            api.abort(403, "You can only modify your own place")

        try:
            place = facade.update_place(place_id, request.json)
            return place.to_dict(), 200
        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


@api.route('/<string:place_id>/reviews')
class PlaceReviewList(Resource):

    def get(self, place_id):

        place = facade.get_place(place_id)

        if not place:
            api.abort(404, "Place not found")

        return [r.to_dict() for r in place.reviews], 200