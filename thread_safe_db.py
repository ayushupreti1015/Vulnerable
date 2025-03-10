import sqlite3
import threading
import queue

class ThreadSafeDBConnection:
    """Thread-safe database connection wrapper"""
    def __init__(self, db_path):
        self.db_path = db_path
        self.connection_queue = queue.Queue()
        self.lock = threading.Lock()
        
        # Create initial connection
        self._init_connection()
        
    def _init_connection(self):
        """Initialize a new database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        self.connection_queue.put(conn)
    
    def execute(self, query, params=None):
        """Execute a query and return the results"""
        with self.lock:
            # Get a connection from the queue
            if self.connection_queue.empty():
                self._init_connection()
            
            conn = self.connection_queue.get()
            
            try:
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                results = list(cursor.fetchall())
                conn.commit()
                lastrowid = cursor.lastrowid
                cursor.close()
                
                # Put the connection back in the queue
                self.connection_queue.put(conn)
                
                return results, lastrowid
            except Exception as e:
                # In case of error, close this connection and create a new one
                conn.close()
                self._init_connection()
                raise e
    
    def close_all(self):
        """Close all database connections"""
        with self.lock:
            while not self.connection_queue.empty():
                conn = self.connection_queue.get()
                conn.close()