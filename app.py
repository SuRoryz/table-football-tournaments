import math
import os
import re
import time
from flask import Flask, redirect, render_template, jsonify, request, send_file, session
from flask_session import Session
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit, disconnect, join_room, leave_room, rooms
from flasgger import Swagger
from sql import DBHelper, db, Match, Team, User, AuthToken, Tournament, Invite
from sqlalchemy.sql import text
from sqlalchemy import or_
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='./build', static_url_path='/')
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['SECRET_KEY'] = 'secret!'
app.config['SESSION_TYPE'] = 'filesystem'
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["UPLOAD_FOLDER"] = "./build/"
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"]

Session(app)
db.init_app(app)
swagger = Swagger(app)

cors = CORS(app, supports_credentials=True)
socketio = SocketIO(app=app, cors_allowed_origins='*')

def auth_ws(session):
    if 'token' in session:
        return DBHelper.authToken(session['token'])

def auth_post(session):
    if 'token' in session:
        print('S', session)
        print(session['token'])
        return DBHelper.authToken(session['token'])
    
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

@app.route('/profile', methods=['GET'])
def profile():
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')

@app.route('/profile/<id>', methods=['GET'])
def profile_withId(id):
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')

@app.route('/tour/<id>', methods=['GET'])
def tour(id):
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')

@app.route('/tournaments', methods=['GET'])
def tournaments():
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')


@app.route('/api/upload_cover', methods=['POST'])
def upload_cover():
    if DBHelper.authToken(session['token']):
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            return jsonify({'message': 'Обложка загружена', 'status': 1, 'result': filename})
    
    return redirect('/login')

@app.route('/api/upload_cover/<typed>', methods=['POST'])
def upload_cover_typed(typed):
    if DBHelper.authToken(session['token']):
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            t, id = typed.split("_")

            if t == "tour":
                Tournament.query.get(id).cover = filename
                db.session.commit()

            if t == "user":
                User.query.get(id).cover = filename
                db.session.commit()

            return jsonify({'message': 'Обложка загружена', 'status': 1, 'result': filename})
        return jsonify({'message': 'Неверный формат обложки', 'status': 0})
    
    return redirect('/login')

@app.route('/api/logout', methods=['POST'])
def logout() -> None :
    """Удаляет токен сессии из куки
    ---
    security:
      - cookieAuth: []
    responses:
      200:
        description: Редирект на страницу логина
    """

    if user := DBHelper.authToken(session['token']):
        session['token'] = None
        DBHelper.deleteToken(user)

    return redirect('/login')

@app.route('/api/login', methods=['POST'])
def login():
    """Используется для авторизации
    После успешной авторизации возвращается токен сессии в куки.
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              description: Имя пользователя
              type: string
              required: true
            password:
              description: Пароль
              type: string
              required: true
    definitions:
      components:
        securitySchemes:
          cookieAuth:
            type: apiKey
            in: cookie
            name: session
      security:
        - cookieAuth: []
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        headers: 
            Set-Cookie:
              schema: 
                type: string
                example: session=abcde12345; Path=/; HttpOnly
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    data = request.json

    if not('username' in data and 'password' in data):
        return jsonify({'message': 'Укажите логин и пароль', 'status': 0})

    username = data['username']
    password = data['password']
    
    token, _ = DBHelper.authUser(username, password)

    if token:
        session['token'] = token
        res = jsonify({'message': 'Успешный вход', 'status': 1})
        res.headers.add('Access-Control-Allow-Origin', '*')
        return res
    
    return jsonify({'message': 'Ошибка входа', 'status': 0})

@app.route('/api/register', methods=['POST'])
def register():
    """Используется для регистрации
    После успешной регистрации редиректит на страницу логина
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              description: Имя пользователя
              type: string
              required: true
            password:
              description: Пароль
              type: string
              required: true
            role:
              description: Роль. Организатор не может учавствовать в турнире, а участники не могут их организовать
              type: string
              required: true
              enum: ['org', 'user']
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    data = request.json

    if not('username' in data and 'password' in data and 'role' in data) or (
        len(data['username']) < 4 or len(data['password']) < 4 or data['role'] not in ['org', 'user']):
        return jsonify({'message': 'Укажите логин и пароль', 'status': 0})

    username = data['username']
    password = data['password']
    role = data['role']

    status = DBHelper.createUser(username, password, role)

    if status:
        return jsonify({'message': 'Успешная регистрация', 'status': 1})
    else:
        return jsonify({'message': 'Ошибка регистрации', 'status': 0})

@app.route('/api/team/query_invite/<query>', methods=['POST'])
def query_invite(query):
    """Используется для поиска среди игроков
    Для приглашения в команду
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: query
        in: path
        required: true
        additionalProperties:
          type: [string, integer] 
        description: Строка поиска или ID пользователя для поиска
    responses:
      200:
        description: Объект с сообщением и статусом запроса и результатом запроса
        schema:
          type: object
          properties:
            message:
              type: string
            status:
              type: integer
            result:
              type: array
              items:
                type: object
                properties:
                  id:
                    description: ID пользователя
                    type: integer
                  name:
                    description: Имя пользователя
                    type: string
                  cover:
                    description: Ссылка на аватар пользователя
                    type: string
        examples:
          {'message': 'string', 'status': 1, result: [
            {
                'id': 0,
                'name': "string",
                'cover': "string"
            }
          ]}
    """

    if user := DBHelper.authToken(session['token']):
        if not query:
            return jsonify({'message': 'Передайте айди пользователя', 'status': 0})
        
        if not user.team_id:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        team = Team.query.get(user.team_id)

        if len(team.users) > 1:
            return jsonify({'message': 'Команда заполнена', 'status': 0})
        
        if not team or team.cap != user.id:
            return jsonify({'message': 'Вы не капитан команды', 'status': 0})
        
        data = User.query.filter(or_(User.id == query, User.username.contains(query))).all()

        return jsonify({'message': 'success', 'status': True, 'result': [
            {
                'id': user.id,
                'name': user.username,
                'cover': user.cover
            } for user in data
        ]})

    return jsonify({'message': 'Вы отправили приглашение', 'status': 1})

@app.route('/api/team/invite/<user_id>', methods=['POST'])
def team_invite(user_id):
    """Используется для приглашения игрока в команду
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
        description: ID пользователя для приглашения
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        if not user_id:
            return jsonify({'message': 'Передайте айди пользователя', 'status': 0})
        
        if not user.team_id:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        if not User.query.get(user_id):
            return jsonify({'message': 'Пользователь не найден', 'status': 0})
        
        team = Team.query.get(user.team_id)

        if not team or team.cap != user.id:
            return jsonify({'message': 'Вы не капитан команды', 'status': 0})
        
        if len(team.users) > 1:
            return jsonify({'message': 'Команда заполнена', 'status': 0})
        
        DBHelper.createInvite(user_id, user.team_id, user.id)
        socketio.emit("ping", rooms=["/profile/" + str(user.id)])

        return jsonify({'message': 'success', 'status': True})

    return jsonify({'message': 'Вы отправили приглашение', 'status': 1})
    
@app.route('/api/team/accept_invite/<id>', methods=['POST'])
def accept_invite(id):
    """Используется для принятия приглашения в команду
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: id
        in: path
        required: true
        type: integer
        description: ID приглашения
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        invite = Invite.query.filter(Invite.user_id == user.id / Invite.id == id).first()

        if not invite:
            return jsonify({'message': 'Приглашение не найдено', 'status': 0})

        if invite:
            if user.team_id:
                return jsonify({'message': 'Покиньте свою команду', 'status': 0})

            DBHelper.addInTeam(Team.query.get(invite.team_id), user)

            socketio.emit("ping", rooms=["/profile/" + str(user.id)])
            socketio.emit("ping", rooms=["/profile/" + str(invite.owner_id)])

            db.session.delete(invite)
            db.session.commit()

            return jsonify({'message': 'Вы приняли приглашение', 'status': 1})
        return jsonify({'message': 'Ошибка', 'status': 0})
    
    return redirect('/login')


@app.route('/api/team/decline_invite/<id>', methods=['POST'])
def decline_invite(id):
    """Используется для отклонения приглашения в команду
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: id
        in: path
        required: true
        type: integer
        description: ID приглашения
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        invite = Invite.query.filter(Invite.user_id == user.id / Invite.id == id).first()

        if not invite:
            return jsonify({'message': 'Приглашение не найдено', 'status': 0})

        if invite:
            db.session.delete(invite)
            db.session.commit()

            socketio.emit("ping", rooms=["/profile/" + str(user.id)])

            return jsonify({'message': 'Вы отклонили приглашение', 'status': 2})
        return jsonify({'message': 'Ошибка', 'status': 1})

    return redirect('/login')

@app.route('/api/team/leave', methods=['POST'])
def leave_team():
    """Используется для выхода из команды
    Если вы лидером команды, она не будет расформирована
    Чтобы история матчей отсавалась доступной
    ---
    security:
      - cookieAuth: []
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):

        team = None
        if user.team_id:
            team = Team.query.get(user.team_id)

        if not team:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        if user.id == team.cap:
            teammate = team.users[-1]

            DBHelper.removeTeam(user, team)
            socketio.emit("ping", rooms=["/profile/" + str(user.id)])
            socketio.emit("ping", rooms=["/profile/" + str(teammate.id)])
        else:
            DBHelper.removeFromTeam(user, team)
            socketio.emit("ping", rooms=["/profile/" + str(user.id)])
            socketio.emit("ping", rooms=["/profile/" + str(team.cap)])
        
        return jsonify({'message': 'Вы вышли из команды', 'status': 1})
    
    return redirect('/login')

@app.route('/api/getMe', methods=['POST'])
def getMe():
    """Используется для получения информации о текущем пользователе
    ---
    security:
      - cookieAuth: []
    responses:
      200:
        description: Объект с сообщением, статусом запроса и данными
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
            result:
              description: Объект данных
              type: object
              properties:
                id:
                  description: ID пользователя
                  type: integer
                username:
                  description: Имя пользователя
                  type: string
                role:
                  description: Роль пользователя
                  type: string
                  enum: ['user', 'org']
                cover:
                  description: Ссылка на обложку пользователя
                  type: string
                all_games:
                  description: Количество матчей
                  type: integer
                wins:
                  description: Количество побед
                  type: integer
                matches:
                  description: Последние 10 матчей
                  type: array
                  items:
                    type: object
                    properties:
                      T1:
                        description: Название команды 1
                        type: string
                      T2:
                        description: Название команды 2
                        type: string
                      score:
                        description: Счёт матча
                        type: string
                        example: '8:0'
                      tournament:
                        description: ID турнира
                        type: integer
                invites:
                  description: Последние 10 приглашений
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        description: ID приглашения
                        type: integer
                      team_id:
                        description: ID команды для приглашения
                        type: integer
                      team_name:
                        description: Название команды
                        type: string
                team:
                  description: Информация о команде
                  type: object
                  properties:
                    id:
                      description: ID команды
                      type: integer
                    name:
                      description: Название команды
                      type: string
                    cap:
                      description: ID лидера команды
                      type: integer
                    cover:
                      description: Ссылка на обложку команды
                      type: string
                    members:
                      description: Список участников команды
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            description: ID участника
                            type: integer
                          username:
                            description: Имя участника
                            type: string
                          cover:
                            description: Ссылка на обложку участника
                            type: string
    """

    if user := DBHelper.authToken(session['token']):
        team = None
        if user.team_id:
            team = Team.query.get(user.team_id)

        invites = Invite.query.filter(Invite.user_id == user.id).all()
        matches = db.session.query(Match).join(Match.users).filter(User.id == user.id).limit(10)

        return jsonify({'message': 'Успех', 'status': 1, 'result': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'cover': user.cover,
            'all_games': Match.query.filter(Match.users.contains(user)).count(),
            'wins': Match.query.filter_by(winner=user.id).count(),
            'matches': [
                {
                    'T1': match.teams[0].name,
                    'T2': match.teams[1].name,
                    'score': match.score,
                    'tournament': match.tournament_id,
                } for match in matches
            ] if matches else None,
            'invites': [
                {
                    'id': invite.id,
                    'team_id': invite.team_id,
                    'team_name': Team.query.get(invite.team_id).name
                } if Team.query.get(invite.team_id) else None for invite in invites
            ] if invites else None,
            'team': {
                'id': team.id,
                'name': team.name,
                'cap': team.cap,
                'cover': team.cover,
                'members': [
                    {
                        'id': member.id,
                        'username': member.username,
                        'cover': member.cover
                    } for member in team.users
                ]
            } if team else None
        }})
    
    return redirect('/login')

@app.route('/api/getTournaments', methods=['POST'])
def getTournaments():
    """Используется для получения списка турниров
    Используются пагинация и фильтры
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: id
        in: body
        required: true
        type: object
        schema:
          type: object
          properties:
            query:
              description: Поиск
              type: string
            size:
              description: Размер турнира
              type: string
              enum: ['all', 'small', 'medium', 'large']
              default: 'all'
            difficulty:
              description: Сложность турнира
              type: string
              enum: ['all', 'easy', 'medium', 'hard']
              default: 'all'
            sort_by:
              description: Сортировка
              type: string
              enum: ['date', 'name']
              default: 'date'
            order:
              description: Порядок сортировки
              type: string
              enum: ['asc', 'desc']
              default: 'desc'
            page:
              description: Страница для пагинации
              type: integer
              default: 1
            count:
              description: Количество элементов на странице
              type: integer
              default: 10
            only_mine:
              description: Только мои турниры
              type: boolean
              default: false
            i_org:
              description: Только организованные турниры
              type: boolean
              default: false
    responses:
      200:
        description: Объект с сообщением, статусом запроса и данными
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
            result:
              type: array
              items:
                type: object
                properties:
                  id:
                    description: ID турнира
                    type: integer
                  name:
                    description: Название турнира
                    type: string
                  cover:
                    description: Ссылка на обложку турнира
                    type: string
                  status:
                    description: Статус турнира
                    type: string
                    enum: ['open', 'active', 'closed']
                  start_date:
                    description: Дата начала турнира
                    type: integer
                  players:
                    description: Количество участников / всего
                    type: string
                    example: '2/4'
                  difficulty:
                    description: Сложность турнира
                    type: string
                    enum: ['easy', 'medium', 'hard']
                  size:
                    description: Размер турнира
                    type: string
                    enum: ['small', 'medium', 'large']
                  i_in:
                    description: Участвует текущий пользователь в турнире
                    type: boolean
    """

    if user := DBHelper.authToken(session['token']):
        data = request.json

        team = None
        if user.team_id:
            team = Team.query.get(user.team_id)

        tournaments = Tournament.query.order_by(
            text(
            f"{'start_date' if data['sort_by'] == 'date' else 'name'} {'desc' if data['order'] == 'desc' else 'asc'}"
            )
        ).filter(
            Tournament.name.contains(data['query'])
        )

        if data['size'] != "all":
            tournaments = tournaments.filter(
                Tournament.size == data['size']
            )
        
        if data['difficulty'] != "all":
            tournaments = tournaments.filter(
                Tournament.difficulty == data['difficulty']
            )
        
        if data['only_mine']:
            tournaments = tournaments.filter(Tournament.teams.contains(team))
        
        if data['i_org']:
            tournaments = tournaments.filter(Tournament.org == user.id)

        all_records = len(tournaments.all())
        tournaments = tournaments.paginate(page=data['page'], error_out=False, max_per_page=data['count'])

        return jsonify({'message': 'Успех', 'status': 1, 'count': round(all_records), 'result': [
            {
                'id': tournament.id,
                'name': tournament.name,
                'players': str(len(tournament.teams)) + "/" + str(tournament.max_teams),
                'size': tournament.size,
                'difficulty': tournament.difficulty,
                'start_date': tournament.start_date,
                'cover': tournament.cover,
                'status': tournament.status,
                'i_in': team in tournament.teams if team else False,
            } for tournament in tournaments
        ]})

    return redirect('/login')

@app.route('/api/getTour/<id>', methods=['POST'])
def getTour(id):
    """Используется для получения полной информации о турнире
    Помогите.
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: id
        in: path
        required: true
        type: integer
        description: ID турнира
    responses:
      200:
        description: Объект с сообщением и статусом запроса. Он большой.
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
            result:
              type: object
              properties:
                id:
                  description: ID турнира
                  type: integer
                name:
                  description: Название турнира
                  type: string
                size:
                  description: Размер турнира
                  type: string
                  enum: ['small', 'medium', 'large']
                difficulty:
                  description: Сложность турнира
                  type: string
                  enum: ['easy', 'medium', 'hard']
                start_date:
                  description: Дата начала турнира
                  type: integer
                is_i_org:
                  description: Турнир организован мной?
                  type: boolean
                org:
                  description: ID организатора
                  type: integer
                i_in:
                  description: Участвует текущий пользователь в турнире
                  type: boolean
                max_teams:
                  description: Максимальное количество участников
                  type: integer
                matches:
                  description: Турирная сетка
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        description: ID турнира
                        type: integer
                      T1:
                        description: ID первого участника
                        type: integer
                      T2:
                        description: ID второго участника
                        type: integer
                      winner:
                        description: ID победившего участника
                        type: integer
                      score:
                        description: Счет матча
                        type: string
                        example: '1:0'
                      state:
                        description: Статус матча
                        type: string
                cover:
                  description: Ссылка на обложку турнира
                  type: string
                win_score:
                  description: Минимальный счет для победы
                  type: integer
                winner:
                  description: Объект победившей команды
                  type: object
                  properties:
                    id:
                      description: ID победившей команды
                      type: integer
                    name:
                      description: Название победившей команды
                      type: string
                    cover:
                      description: Ссылка на обложку победившей команды
                      type: string
                    members:
                      description: Объекты участников победившей команды
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            description: ID участника
                            type: integer
                          name:
                            description: Имя участника
                            type: string
                          cover:
                            description: Ссылка на обложку участника
                            type: string

                status:
                  description: Статус турнира
                  type: string
                  enum: ['open', 'active', 'closed']
    """

    if user := DBHelper.authToken(session['token']):
        tour = Tournament.query.get(id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        team = None
        if user.team_id:
            team = Team.query.get(user.team_id)
        
        b = eval(tour.brackets)

        matches = {}
        prev = None
        
        for phase in b:
            matches[phase] = []

            for idx, obj in enumerate(b[phase]):
                if obj[1] == "Match":
                    match = Match.query.get(obj[0])

                    matches[phase].append({
                        'T1': match.teams[0].name,
                        'T2': match.teams[1].name,
                        'score': match.score,
                        'winner': Team.query.get(match.winner).name if match.winner else None,
                        'id': match.id,
                        'state': "DONE" if match.done else "NO_SHOW"
                    })
                else:
                    if not prev and idx < len(b[phase]) - 1:
                        prev = Team.query.get(obj[0]).name,
                        continue
                    
                    elif idx < len(b[phase]): 
                        matches[phase].append({
                            'T1': prev,
                            'T2': Team.query.get(obj[0]).name,
                            'winner': None,
                            'score': None,
                            'id': None,
                            'state': "NO_PARTY"
                        })

                        prev = None
                        
                    else:
                        matches[phase].append({
                            'T1': Team.query.get(obj[0]).name,
                            'T2': None,
                            'winner': None,
                            'score': None,
                            'id': None,
                            'state': "NO_PARTY"
                        })

        return jsonify({'message': 'Успех!', 'status': 1, 'result': {
            'id': tour.id,
            'name': tour.name,
            'size': tour.size,
            'difficulty': tour.difficulty,
            'start_date': tour.start_date,
            'is_i_org': user.id == tour.org,
            'org': tour.org,
            'i_in': team in tour.teams if team else False,
            'max_teams': tour.max_teams,
            'matches': matches,
            'cover': tour.cover,
            'win_score': tour.win_score,
            'winner': {
                'id': tour.winner,
                'name': Team.query.get(tour.winner).name,
                'cover': Team.query.get(tour.winner).cover,
                "members": [{
                    'id': member.id,
                    'username': member.username,
                    'cover': member.cover
                } for member in Team.query.get(tour.winner).users]

            } if tour.winner and tour.status == "closed" else None,
            'status': tour.status
        }})
    
    return redirect('/login')

@app.route('/api/getUser/<id>', methods=['POST'])
def getUser(id):
    """Используется для получения информации о пользователе по ID
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: id
        in: path
        required: true
        type: integer
        description: ID пользователя
    responses:
      200:
        description: Объект с сообщением, статусом запроса и данными
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
            result:
              description: Объект данных
              type: object
              properties:
                id:
                  description: ID пользователя
                  type: integer
                username:
                  description: Имя пользователя
                  type: string
                role:
                  description: Роль пользователя
                  type: string
                  enum: ['user', 'org']
                cover:
                  description: Ссылка на обложку пользователя
                  type: string
                all_games:
                  description: Количество матчей
                  type: integer
                wins:
                  description: Количество побед
                  type: integer
                matches:
                  description: Последние 10 матчей
                  type: array
                  items:
                    type: object
                    properties:
                      T1:
                        description: Название команды 1
                        type: string
                      T2:
                        description: Название команды 2
                        type: string
                      score:
                        description: Счёт матча
                        type: string
                        example: '8:0'
                      tournament:
                        description: ID турнира
                        type: integer
                invites:
                  description: Последние 10 приглашений
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        description: ID приглашения
                        type: integer
                      team_id:
                        description: ID команды для приглашения
                        type: integer
                      team_name:
                        description: Название команды
                        type: string
                team:
                  description: Информация о команде
                  type: object
                  properties:
                    id:
                      description: ID команды
                      type: integer
                    name:
                      description: Название команды
                      type: string
                    cap:
                      description: ID лидера команды
                      type: integer
                    cover:
                      description: Ссылка на обложку команды
                      type: string
                    members:
                      description: Список участников команды
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            description: ID участника
                            type: integer
                          username:
                            description: Имя участника
                            type: string
                          cover:
                            description: Ссылка на обложку участника
                            type: string
    """
        
    if DBHelper.authToken(session['token']):
        user = User.query.get(id)

        team = None
        if user.team_id:
            team = Team.query.get(user.team_id)
        
        matches = db.session.query(Match).join(Match.users).filter(User.id == user.id).limit(10)

        return jsonify({'message': 'Успех', 'status': 1, 'result': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'cover': user.cover,
            'all_games': Match.query.filter(Match.users.contains(user)).count(),
            'wins': Match.query.filter_by(winner=user.id).count(),
            'matches': [
                {
                    'T1': match.teams[0].name,
                    'T2': match.teams[1].name,
                    'score': match.score,
                    'tournament': match.tournament_id,
                } for match in matches
            ] if matches else None,
            'team': {
                'id': team.id,
                'name': team.name,
                'cap': team.cap,
                'cover': team.cover,
                'members': [
                    {
                        'id': member.id,
                        'username': member.username,
                        'cover': member.cover
                    } for member in team.users
                ]
            } if team else None
        }})

    return redirect('/login')

@app.route('/api/team/create_team/<name>', methods=['POST'])
def create_team(name):
    """Используется для создания команды
    Команды могут создавать только участники
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: name
        in: path
        required: true
        type: string
        description: Название команды
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        if user.role == "org":
            return jsonify({'message': 'Только участники могут создавать команды', 'status': 0})

        if not name:
            return jsonify({'message': 'Укажите имя команды', 'status': 0})
        
        if user.team_id:
            return jsonify({'message': 'Вы уже в команде', 'status': 0})
        
        status = DBHelper.createTeam(name, user)
        socketio.emit("ping", rooms=["/profile/" + str(user.id)])

        if status:
            return jsonify({'message': 'Команда создана', 'status': status})
        else:
            return jsonify({'message': 'Ошибка', 'status': status})

    return redirect('/login')

@app.route('/api/tour/get_for_user', methods=['POST'])
def get_tours_for_user():
    """Используется для получения истории турниров
    На странцие пользователя
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: body
        in: body
        required: true
        type: object
        schema:
          type: object
          properties:
            user_id:
              description: ID пользователя
              type: integer
              required: true
            offset:
              description: Смещение для пагинации
              type: integer
              required: true
              default: 0
    responses:
      200:
        description: Объект с сообщением, статусом запроса и данными
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
            result:
              description: Список турниров
              type: array
              items:
                type: object
                properties:
                  id:
                    description: ID турнира
                    type: integer
                  name:
                    description: Название турнира
                    type: string
                  cover:
                    description: Ссылка на обложку турнира
                    type: string
                  winner:
                    description: ID победившей команды
                    type: integer
    """

    if user := DBHelper.authToken(session['token']):
        data = request.json

        if not 'offset' in data:
            offset = 0
        else:
            offset = data['offset']
        
        if not 'user_id' in data:
            return jsonify({'message': 'Укажите ID пользователя', 'status': 0})
        
        user_id = data['user_id']
        u = User.query.get(user_id)

        if not u:
            return jsonify({'message': 'Пользователь не найден', 'status': 0})

        tours = Tournament.query.join(Tournament.matches).filter(Match.users.contains(u)).all()

        return jsonify({'message': 'Успех', 'status': 1, 'result': [
            {
                'id': tour.id,
                'name': tour.name,
                'cover': tour.cover,
                'winner': tour.winner
            } for tour in tours
        ]})

    return redirect('/login')

@app.route('/api/tour/join/<id>', methods=['POST'])
def join_tour(id):
    """Используется входа в турнир
    Может использовать только капитан
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: name
        in: path
        required: true
        type: integer
        description: ID турнира
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        if user.role == "org":
            return jsonify({'message': 'Только участники могут присоединить к турниру', 'status': 0})
        
        team = Team.query.get(user.team_id)

        if not team:
            return jsonify({'message': 'Вы не в команде', 'status': 0})

        if len(team.users) != 2:
            return jsonify({'message': 'Команда должна состоять из двух участников', 'status': 0})

        tour = Tournament.query.get(id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        if tour.status != "open":
            return jsonify({'message': 'Турнир закрыт для входа', 'status': 0})

        if not team or team.cap != user.id:
            return jsonify({'message': 'Вы не капитан', 'status': 0})
        
        if team.id in tour.teams:
            return jsonify({'message': 'Вы уже учавстник', 'status': 0})
        
        status = DBHelper.addTeamToTournament(id, user.team_id)
        socketio.emit("ping", rooms=["/tour/" + str(tour.id)])

        return jsonify({'message': 'Вы присоединились к турниру', 'status': status})
    
    return redirect('/login')

@app.route('/api/tour/start/<id>', methods=['POST'])
def start_tour(id):
    """Используется для старта турнира
    Может использовать только организатор
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: name
        in: path
        required: true
        type: integer
        description: ID турнира
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        tour = Tournament.query.get(id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        if user.role == "user":
            return jsonify({'message': 'Только организаторы могут запускать турниры', 'status': 0})

        if not user.id == tour.org:
            return jsonify({'message': 'Вы не владелец турнира', 'status': 0})
        
        tour.status = "active"
        tour.max_teams = len(tour.teams)
        
        b = eval(tour.brackets)

        if len(tour.teams) < 2:
            return jsonify({'message': 'Турнир должен содержать не менее двух участников', 'status': 0})
        
        for i in range(int(math.ceil(math.log(len(tour.teams), 2)))):
            if i == 0:
                continue
            b[str(i)] = []
        
        try:
            tour.brackets = str(b)
            tour.left_in_last_phase = len(b["0"])
        except:
            return jsonify({'message': 'Турнир не может быть запущен', 'status': 0})


        db.session.commit()

        tour.mergeTeamsIntoMatches(0)

        socketio.emit("ping", rooms=["/tour/" + str(tour.id)])
        return jsonify({'message': 'Турнир начат', 'status': 1})

    return redirect('/login')

@app.route('/api/tour/edit_score', methods=['POST'])
def edit_score():
    """Используется для изменения счёта матча
    Может использовать только организатор
    Единственный способ продвигать турнир вперед
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: body
        in: body
        required: true
        type: object
        schema:
          type: object
          properties:
            match_id:
              description: ID матча
              type: integer
              required: true
            score:
              description: Новый счёт
              type: string
              required: true
              example: '1:0'
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        data = request.json

        if user.role == "user":
            return jsonify({'message': 'Только организаторы могут изменять турниры', 'status': 0})

        match = Match.query.get(data['match_id'])

        if not match:
            return jsonify({'message': 'Матч не найден', 'status': 0})
        
        tour = Tournament.query.get(match.tournament_id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        done = any(i >= int(tour.win_score) for i in map(int, data['score'].split(":")))
        score = data['score']

        if done:
            score = map(lambda x: min(tour.win_score, int(x)), score.split(":"))
            score = ":".join(map(str, score))

        if not user.id == tour.org:
            return jsonify({'message': 'Вы не владелец турнира', 'status': 0})
        
        match.updateScore(score)
        db.session.commit()

        socketio.emit("edit_score", {'match': match.id, 'score': score}, rooms=["/tour/" + str(tour.id)])

        if done:
            socketio.emit("ping", rooms=["/tour/" + str(tour.id)])

        return jsonify({'message': 'Счёт изменен', 'status': 1})

    return redirect('/login')

@app.route('/api/tour/delete_tournament/<id>', methods=['POST'])
def delete_tournament(id):
    """Используется для удаления турнира
    Может использовать только организатор
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: name
        in: path
        required: true
        type: integer
        description: ID турнира
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """
    if user := DBHelper.authToken(session['token']):
        if user.role == "user":
            return jsonify({'message': 'Только организаторы могут изменять турниры', 'status': 0})

        tour = Tournament.query.get(id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        if not user.id == tour.org:
            return jsonify({'message': 'Вы не владелец турнира', 'status': 0})
        
        socketio.emit("ping", rooms=["/tournaments"])
        
        db.session.delete(tour)
        db.session.commit()

        return jsonify({'message': 'Турнир удалён', 'status': 1})

    return redirect('/login')

@app.route('/api/tour/reset_tournament/<id>', methods=['POST'])
def reset_tournament(id):
    """Используется для ресета турнирной сетки
    Все команды вернутся на начальные позиции
    Может использовать только организатор
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: name
        in: path
        required: true
        type: integer
        description: ID турнира
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """
    if user := DBHelper.authToken(session['token']):
        if user.role == "user":
            return jsonify({'message': 'Только организаторы могут изменять турниры', 'status': 0})

        tour = Tournament.query.get(id)

        if not tour:
            return jsonify({'message': 'Турнир не найден', 'status': 0})

        if not user.id == tour.org:
            return jsonify({'message': 'Вы не владелец турнира', 'status': 0})
        
        tour.reset()

        socketio.emit("ping", rooms=["/tour/" + str(tour.id)])
        return jsonify({'message': 'Турнир сброшен', 'status': 1})
    
    return redirect('/login')

@app.route('/api/tour/create_tournament', methods=['POST'])
def create_tournament():
    """Используется для создания турнира
    Может использовать только организатор
    ---
    security:
      - cookieAuth: []
    parameters:
      - name: body
        in: body
        required: true
        type: object
        schema:
          type: object
          properties:
            name:
              type: string
              required: true
            max_teams:
              type: integer
              default: 8
            size:
              type: string
              enum: ['small', 'medium', 'large']
              default: 'small'
            difficulty:
              type: string
              enum: ['easy', 'medium', 'hard']
              default: 'easy'
            win_score:
              type: integer
              default: 7
            start_date:
              type: integer
              default: 999999999999999
            cover:
              type: string
              default: 'placeholder_tour.jpg'
    responses:
      200:
        description: Объект с сообщением и статусом запроса
        schema:
          type: object
          properties:
            message:
              description: Сообщение с информацией 
              type: string
            status:
              description: Статус исполнения запроса
              type: integer
        examples:
          {'message': 'string', 'status': 0}
    """

    if user := DBHelper.authToken(session['token']):
        data = request.json

        if user.role == "user":
            return jsonify({'message': 'Только организаторы могут изменять турниры', 'status': 0})

        if not 'max_teams' in data:
            max_teams = 8
        else:
            max_teams = data['max_teams']

        if not 'size' in data:
            size = 'small'
        else:
            size = data['size']
        
        if not 'difficulty' in data:
            difficulty = 'easy'
        else:
            difficulty = data['difficulty']
        
        if not 'win_score' in data:
            win_score = 7
        else:
            win_score = data['win_score']
        
        if not 'start_date' in data:
            start_date = 999999999999
        else:
            start_date = data['start_date']
        
        if not 'cover' in data:
            cover = 'placeholder_tour.jpg'
        else:
            cover = data['cover']

        status = DBHelper.createTournament(data['name'],
                                           user.id,
                                           max_teams,
                                           size,
                                           difficulty,
                                           win_score,
                                           start_date,
                                           cover)
        
        socketio.emit("ping", rooms=["/tournaments"])

        if status:
            return jsonify({'message': 'Турнир создан', 'status': 1})
        else:
            return jsonify({'message': 'Ошибка', 'status': 0})

    return redirect('/login')

@socketio.on('connect')
def on_connect(*args):
    if user := auth_ws(session):
        emit('connected', {'id': user.id})
    else:
        disconnect()

@socketio.on('unsub_all')
def unsub_all():
    if user := auth_ws(session):
        for room in rooms():
            leave_room(room)
    else:
        disconnect()

@socketio.on('listen_for')
def listen_for(data):
    if user := auth_ws(session):
        room = data['room']

        if room in ["/register", "/login"]:
            return
        if room == "/profile":
            room = f"/profile/{user.id}"
        
        join_room(room)
    else:
        disconnect()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    socketio.run(app, host="0.0.0.0", port=443, certfile='./certificate.crt', keyfile='./privatkey.pem', server_side=True)