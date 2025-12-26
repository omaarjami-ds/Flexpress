import os
import sys

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'delivery.db')

if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Base de données supprimée: {db_path}")
else:
    print(f"Base de données non trouvée: {db_path}")

from init_data import init_test_data
init_test_data()
