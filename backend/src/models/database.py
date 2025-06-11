import psycopg2
import psycopg2.extras
from contextlib import contextmanager
import os

class DatabaseConnection:
    def __init__(self):
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'supply_chain_db'),
            'user': os.getenv('DB_USER', 'ubuntu'),
            'password': os.getenv('DB_PASSWORD', 'ubuntu'),
            'port': int(os.getenv('DB_PORT', 5432))
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(**self.config)
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
        """Context manager for database cursors"""
        with self.get_connection() as conn:
            cursor = None
            try:
                if dict_cursor:
                    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                else:
                    cursor = conn.cursor()
                yield cursor, conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                if cursor:
                    cursor.close()

# Global database instance
db = DatabaseConnection()

