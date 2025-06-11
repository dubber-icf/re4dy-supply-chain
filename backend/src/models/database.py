from flask import current_app
from contextlib import contextmanager
import os

class DatabaseConnection:
    def __init__(self):
        # No longer needed - SQLAlchemy handles connection config
        pass
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections using SQLAlchemy"""
        engine = current_app.extensions["sqlalchemy"].engine
        conn = None
        try:
            conn = engine.connect()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()
    
    @contextmanager
    def get_cursor(self, dict_cursor=True):
        """Context manager for database cursors using SQLAlchemy"""
        with self.get_connection() as conn:
            try:
                # SQLAlchemy connection object for direct SQL execution
                yield conn, conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e

# Global database instance
db = DatabaseConnection()

