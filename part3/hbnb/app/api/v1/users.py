from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.services import facade

api = Namespace('users', description='User operations')


user_model = api.model('User', {
    "id": fields.String(readonly=True),
    "first_name": fields.String(required=True),
    "last_name": fields.String(required=True),
    "email": fields.String(required=True),
    "is_admin": fields.Boolean
})


user_create_model = api.model('UserCreate', {
    "first_name": fields.String(required=True),
    "last_name": fields.String(required=True),
    "email": fields.String(required=True),
    "password": fields.String(required=True)
})


login_model = api.model('Login', {
    "email": fields.String(required=True),
    "password": fields.String(required=True)
})


@api.route('/')
class UserList(Resource):

    def get(self):
        users = facade.get_all_users()
        return [u.to_dict() for u in users], 200

    @api.expect(user_create_model, validate=True)
    @api.marshal_with(user_model, code=201)
    @jwt_required()
    def post(self):
        current_user = get_jwt()
        if not current_user.get('is_admin'):
            return {'error': 'Admin privileges required'}, 403

        user_data = request.json
        email = user_data.get('email')

        if facade.get_user_by_attribute('email', email):
            return {'error': 'Email already registered'}, 400
        try:
            user = facade.create_user(request.json)
            return user.to_dict(), 201
        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


@api.route('/<string:user_id>')
class UserResource(Resource):

    def get(self, user_id):
        user = facade.get_user(user_id)
        if not user:
            api.abort(404, "User not found")
        return user.to_dict(), 200

    @jwt_required()
    def put(self, user_id):

        current_user = get_jwt_identity()

        if current_user != user_id:
            api.abort(403, "You can only modify your own account")

        try:
            user = facade.update_user(user_id, request.json)

            if not user:
                api.abort(404, "User not found")

            return user.to_dict(), 200

        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


@api.route('/login')
class UserLogin(Resource):

    @api.expect(login_model)
    def post(self):

        data = request.json

        user = facade.user_repo.get_by_attribute("email", data["email"])

        if not user or not user.check_password(data["password"]):
            api.abort(401, "Invalid email or password")

        access_token = create_access_token(
            identity=user.id,
            additional_claims={"is_admin": user.is_admin}
        )

        return {"access_token": access_token}, 200
