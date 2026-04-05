from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Ensure model metadata is registered with Base before migrations/startup tasks.
from app.models import booking, rating, ride, user  # noqa: F401, E402
