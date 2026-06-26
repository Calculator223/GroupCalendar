import os

from flask import Flask

def create_app(test_config=None):
    # Create and configure app
    app = Flask(__name__, instance_relative_config=None)
    app.config.from_mapping(
        SECRET_KEY = 'dev',
        DATABASE = os.path.join(app.instance_path, 'groupcalendar_sqlite.db')
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)
    
    # Create instance folder if it does not exist
    os.makedirs(app.instance_path, exist_ok=True)

    from . import db
    db.init_app(app)

    from . import auth
    app.register_blueprint(auth.bp)

    from . import calendar
    app.register_blueprint(calendar.main_bp)
    app.add_url_rule('/', endpoint='index')
    app.register_blueprint(calendar.api_bp)

    return app
