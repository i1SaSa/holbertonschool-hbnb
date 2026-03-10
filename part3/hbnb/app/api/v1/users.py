from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import create_access_token, jwt_required
from app.services import facade

api = Namespace('users', description='User operations')


# Model used for user responses (no password returned)
user_model = api.model('User', {
    "id": fields.String(readonly=True),
    "first_name": fields.String(required=True),
    "last_name": fields.String(required=True),
    "email": fields.String(required=True),
    "is_admin": fields.Boolean
})


# Model used when creating a user (includes password)
user_create_model = api.model('UserCreate', {
    "first_name": fields.String(required=True),
    "last_name": fields.String(required=True),
    "email": fields.String(required=True),
    "password": fields.String(required=True),
    "is_admin": fields.Boolean
})


# Model used for login
login_model = api.model('Login', {
    "email": fields.String(required=True),
    "password": fields.String(required=True)
})


@api.route('/')
class UserList(Resource):

    # Only authenticated users can see users
    @jwt_required()
    @api.marshal_list_with(user_model)
    def get(self):
        """Retrieve all users"""
        users = facade.get_all_users()
        return [u.to_dict() for u in users], 200

    @api.expect(user_create_model, validate=True)
    @api.marshal_with(user_model, code=201)
    def post(self):
        """
        Create a new user
        """
        try:
            user = facade.create_user(request.json)
            return user.to_dict(), 201
        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


@api.route('/<string:user_id>')
class UserResource(Resource):

    @api.marshal_with(user_model)
    def get(self, user_id):
        """
        Get user by ID
        """
        user = facade.get_user(user_id)
        if not user:
            api.abort(404, "User not found")

        return user.to_dict(), 200

    @api.expect(user_create_model, validate=True)
    @api.marshal_with(user_model)
    def put(self, user_id):
        """
        Update user
        """
        try:
            user = facade.update_user(user_id, request.json)

            if not user:
                api.abort(404, "User not found")

            return user.to_dict(), 200

        except (TypeError, ValueError) as e:
            api.abort(400, str(e))


# ---------------------------
# LOGIN ENDPOINT (JWT)
# ---------------------------

@api.route('/login')
class UserLogin(Resource):

    @api.expect(login_model)
    def post(self):
        """
        Authenticate user and return JWT token
        """

        data = request.json

        user = facade.user_repo.get_by_attribute("email", data["email"])

        if not user or not user.check_password(data["password"]):
            api.abort(401, "Invalid email or password")

        access_token = create_access_token(
            identity=user.id,
            additional_claims={"is_admin": user.is_admin}
        )

        return {
            "access_token": access_token
        }, 200