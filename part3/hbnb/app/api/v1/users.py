from flask_restx import Namespace, Resource, fields
from flask import request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from app.services.facade import HBnBFacade

api = Namespace('users', description='User operations')
facade = HBnBFacade()

# Models
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
        """Get all users"""
        users = facade.get_all_users()
        return [u.to_dict() for u in users], 200

    @api.expect(user_create_model, validate=True)
    @api.marshal_with(user_model, code=201)
    def post(self):
        """Create a new user"""
        data = request.json

        is_admin_request = False
        try:
            verify_jwt_in_request(optional=True)
            current_user_claims = get_jwt()
            if current_user_claims and current_user_claims.get('is_admin'):
                is_admin_request = True
        except Exception:
            pass

        if not is_admin_request:
            data['is_admin'] = False

        success, result = facade.create_user(request.json)
        if success:
            return result.to_dict(), 201
        return {'error': result}, 400


@api.route('/<string:user_id>')
class UserResource(Resource):
    def get(self, user_id):
        """Get user by ID"""
        user = facade.get_user(user_id)
        if not user:
            api.abort(404, "User not found")
        return user.to_dict(), 200

    @jwt_required()
    def put(self, user_id):
        """Update user"""
        current_user_id = get_jwt_identity()
        current_user_claims = get_jwt()

        # الشرط الجديد: إذا ما كنت أنت نفس اليوزر، وما كنت أدمن -> نمنعك
        if current_user_id != user_id and not current_user_claims.get('is_admin'):
            api.abort(
                403, "You can only modify your own account unless you are an admin")
        success, result = facade.update_user(user_id, request.json)
        if success:
            return result.to_dict(), 200
        api.abort(400, result)


@api.route('/login')
class UserLogin(Resource):
    @api.expect(login_model)
    def post(self):
        """User login"""
        data = request.json
        user = facade.get_user_by_email(data["email"])

        #  check_password -> verify_password
        if not user or not user.verify_password(data["password"]):
            api.abort(401, "Invalid email or password")

        access_token = create_access_token(
            identity=user.id,
            additional_claims={"is_admin": user.is_admin}
        )
        return {"access_token": access_token}, 200
