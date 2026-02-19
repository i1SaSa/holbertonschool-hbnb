import uuid
from .basemodel import BaseModel


class Place(BaseModel):
    """
    This class represents a place in the system.
    A place has an owner (User),
    amenities and reviews.
    """

    def __init__(self, title, description, price, latitude, longitude, owner):
        super().__init__()

        self.title = title
        self.description = description
        self.price = price
        self.latitude = latitude
        self.longitude = longitude

        self.owner = owner

        # List of Amenity objects
        self.amenities = []

        # List of Review objects
        self.reviews = []


    # ----------------------
    # Title
    # ----------------------
    @property
    def title(self):
        return self.__title

    @title.setter
    def title(self, value):
        if not isinstance(value, str):
            raise TypeError("Title must be a string")

        if len(value.strip()) == 0:
            raise ValueError("Title cannot be empty")

        self.__title = value


    # ----------------------
    # Price
    # ----------------------
    @property
    def price(self):
        return self.__price

    @price.setter
    def price(self, value):
        if not isinstance(value, (int, float)):
            raise TypeError("Price must be a number")

        if value <= 0:
            raise ValueError("Price must be greater than 0")

        self.__price = value


    # ----------------------
    # Latitude
    # ----------------------
    @property
    def latitude(self):
        return self.__latitude

    @latitude.setter
    def latitude(self, value):
        if not isinstance(value, (int, float)):
            raise TypeError("Latitude must be a number")

        if value < -90 or value > 90:
            raise ValueError("Latitude must be between -90 and 90")

        self.__latitude = value


    # ----------------------
    # Longitude
    # ----------------------
    @property
    def longitude(self):
        return self.__longitude

    @longitude.setter
    def longitude(self, value):
        if not isinstance(value, (int, float)):
            raise TypeError("Longitude must be a number")

        if value < -180 or value > 180:
            raise ValueError("Longitude must be between -180 and 180")

        self.__longitude = value

    def add_review(self, review):
        if review not in self.reviews:
            self.reviews.append(review)

    def add_review(self, review):
        self.reviews.append(review)



    def remove_review(self, review):
        if review in self.reviews:
            self.reviews.remove(review)


    # ----------------------
    # Serialization
    # ----------------------
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner": self.owner.to_dict(),
            "amenities": [a.to_dict() for a in self.amenities],
            "reviews": [r.to_dict() for r in self.reviews]
        }
