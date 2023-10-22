from json import loads, dumps
import sqlite3
import random
import uuid
import time

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Boolean, event
from sqlalchemy_events import listen_events, on

from datetime import datetime

import math
import more_itertools as mit

from flask_socketio import SocketIO, emit

class Base(DeclarativeBase):
  pass

db = SQLAlchemy(model_class=Base)

class User(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default='user', nullable=False)

    cover: Mapped[str] = mapped_column(String, nullable=True, default='placeholder_user.jpg')

    team_id: Mapped[int] = db.Column(db.Integer, db.ForeignKey('team.id'))

    def __repr__(self) -> str:
        return f"<User {self.id} {self.username} {self.role} {self.team_id}>"

class AuthToken(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    user: Mapped['User'] = db.relationship('User')

class Invite(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)
    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    owner_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)

class TeamMatches(db.Model):
    __tablename__ = 'team_matches'
    id = db.Column(db.Integer, primary_key=True)
    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)
    match_id: Mapped[int] = db.Column(Integer, db.ForeignKey('match.id'), nullable=False)

class UserMatches(db.Model):
    __tablename__ = 'user_matches'
    id = db.Column(db.Integer, primary_key=True)
    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    match_id: Mapped[int] = db.Column(Integer, db.ForeignKey('match.id'), nullable=False)

class TeamTours(db.Model):
    __tablename__ = 'team_tours'
    id = db.Column(db.Integer, primary_key=True)
    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)
    tournament_id: Mapped[int] = db.Column(Integer, db.ForeignKey('tournament.id'), nullable=False)

class Team(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    cap: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=True)
    users: Mapped[list['User']] = db.relationship('User', backref='team', foreign_keys='User.team_id')

    cover: Mapped[str] = mapped_column(String, nullable=True, default='placeholder_team.jpg')

    def addUser(self, user=None, user_id=None):

        if not user:
            user = User.query.get(user_id)

        user.team_id = self.id

        db.session.commit()

    def __repr__(self) -> str:
        return f"<Team {self.id} {self.name} CAP: {self.cap} TEAM: {self.users} MATCHES: {[match for match in self.matches]}>"

@listen_events
class Tournament(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    start_date: Mapped[int] = mapped_column(Integer, nullable=True, default=999999999999999)
    size: Mapped[str] = mapped_column(String, nullable=False, default='small')
    difficulty: Mapped[str] = mapped_column(String, nullable=False, default='easy')

    win_score: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    cover: Mapped[str] = mapped_column(String, nullable=True, default='placeholder_tour.jpg')

    status: Mapped[str] = mapped_column(String, nullable=False, default='open')
    winner: Mapped[int] = mapped_column(Integer, nullable=True)

    org: Mapped[User] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    teams: Mapped[list['Team']] = db.relationship('Team', secondary=TeamTours.__table__, backref='tournaments')
    matches: Mapped[list['Match']] = db.relationship('Match', backref='tournament')

    current_phase: Mapped[int] = mapped_column(Integer, default=0)
    left_in_last_phase: Mapped[int] = mapped_column(Integer, default=0)

    brackets: Mapped[str] = mapped_column(String, default="{}")

    max_teams: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    def reset(self):
        self.brackets=str({str(i): [] for i in range(int(math.floor(math.log(self.max_teams,2))))})

        for team in self.teams:
            self.addTeamToNextPhase(team.id, 0, True)

        self.status = "open"

        print(self.brackets)
        self.left_in_last_phase = len(eval(self.brackets)["0"])
        db.session.commit()

    def mergeTeamsIntoMatches(self, phase):
        b = eval(self.brackets)
        
        if len(b[str(phase)]) < 2:
            return
        
        batches = list(mit.chunked([team.id for team in self.teams], 2))
        mt = []

        print("\n"*5, batches, mt)

        for i in range(len(batches)):
            batch = batches.pop()

            if len(batch) < 2:
                self.addTeamToNextPhase(batch[0], phase + 1)
                continue

            mt.append(self._merge(batch, phase))

        b = eval(self.brackets)
        print("\n"*5, mt)
        b[str(phase)] = mt
        self.brackets = str(b)

        self.left_in_last_phase = len(b[str(phase)])

        db.session.commit()

    def _tryMerge(self, phase, again=False):
        b = eval(self.brackets)

        jump = False

        teams = []
        for idx, i in enumerate(b[str(phase)]):
            if i[1] == 'Team':
                teams.append(i)
        
        print("REAL", self.left_in_last_phase)
        if self.left_in_last_phase == 0:
            self.left_in_last_phase = self.calcLeft(phase) - 1 if teams else 0

            db.session.commit()

            if len(teams) == 1:
                self.addTeamToNextPhase(teams[0][0], phase + 1)
                пreturn

        if len(teams) > 1:
            q = b[str(phase)]
            b[str(phase)].append(self._merge(teams, phase))

            del q[q.index(teams[0])]
            del q[q.index(teams[1])]
    
        self.brackets = str(b)

        if self.left_in_last_phase == 0:
            if len(teams):
                self.addTeamToNextPhase(teams[0][0], phase + 1)
            
            b = eval(self.brackets)
            counter = 0
            t_counter = 0

            for i in b[str(phase + 1)]:
                print(i)
                if i[1] == "Match":
                    counter += 1
                if i[1] == "Team":
                    t_counter += 1

            if t_counter == 1:     
                self.addTeamToNextPhase(teams[0][0], phase + 1)   

            db.session.commit()

    def _merge(self, teams, phase):
        print(teams)
        team1, team2 = teams

        if not(team1 and team2):
            return False
        
        if type(team1) == tuple:
            team1 = team1[0]
        if type(team2) == tuple:
            team2 = team2[0]
        
        if type(team1) == int:
            team1 = Team.query.get(team1)
        if type(team2) == int:
            team2 = Team.query.get(team2)

        match = Match(teams=[team1, team2], users=[team1.users[0], team1.users[1], team2.users[0], team2.users[1]], tournament_id=self.id, phase=phase)
        db.session.add(match)

        db.session.commit()

        return (match.id, "Match")

    def needJump(self, phase):
        b = eval(self.brackets)
        
        total_phases = len(b)
        teams_needed = 2**(total_phases - phase)

        matches_left = teams_needed / 2 
        teams_on_phase = 0

        for i in b[str(phase)]:
            if i[1] == "Match":
                if Match.query.get(i[0]).done:
                    matches_left -= 1
            else:
                teams_on_phase += 1
        
        if matches_left == 1:
            return True

        return False
        
    def calcLeft(self, phase):
        b = eval(self.brackets)
        
        total_phases = len(b)
        teams_needed = 2**(total_phases - phase)

        matches_left = teams_needed / 2 

        t = 0

        for i in b[str(phase)]:
            if i[1] == "Match":
                if Match.query.get(i[0]).done:
                    matches_left -= 1
                else:
                    t += 1
        
        if t == 1:
            matches_left =- 1

        return matches_left

    def addTeamToNextPhase(self, team_id, phase, init=False):
        b = eval(self.brackets)
        
        print("\n"*4, phase, len(b))
        if phase >= len(b):
            self.setWinner(team_id)

            print("WINNER")
            return
        
        else:
            b = eval(self.brackets)
            b[str(phase)].append((team_id, 'Team'))

            self.brackets = str(b)
            db.session.commit()

            b = eval(self.brackets)
            counter = 0
            t_counter = 0

            for i in b[str(phase)]:
                if i[1] == "Match":
                    counter += 1
                if i[1] == "Team":
                    t_counter += 1

            if counter and t_counter == 1 and self.left_in_last_phase == 0:
                c = 0

                for m in b[str(phase + 1)]:
                    if m[1] == "Match":
                        if Match.query.get(m[0]).done:
                            c += 1
                
                self.left_in_last_phase = len(b[str(phase + 1)])
                self.addTeamToNextPhase(team_id, phase + 1)
                return
            
            self.left_in_last_phase -= 1

            if not init:
                try:
                    print("MERGE", self.left_in_last_phase)
                    
                    self._tryMerge(phase)
                except Exception as e:
                    print(e)
        
        db.session.commit()

    def setWinner(self, team_id):
        self.status = 'closed'
        self.winner = team_id

        db.session.commit()

    def __repr__(self) -> str:
        return  (f"\n<Tournament {self.id} {self.name} MATCHES: {[match.id for match in self.matches]}> Teams: {[team.name for team in self.teams]}"
                f"Phases: {self.brackets} | Status: {self.status} | Winner: {self.winner}")

class Match(db.Model, ):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    winner: Mapped[int] = mapped_column(Integer, nullable=True)
    match_time: Mapped[int] = mapped_column(Integer, nullable=True)

    score: Mapped[str] = mapped_column(String, nullable=True, default="0:0")

    agreed: Mapped[bool] = mapped_column(Boolean, default=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)

    phase: Mapped[int] = mapped_column(Integer, nullable=True)

    teams = db.relationship('Team', secondary=TeamMatches.__table__, backref='matches')
    users = db.relationship('User', secondary=UserMatches.__table__, backref='matches')

    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)

    def updateScore(self, score):
        self.score = score
        t = Tournament.query.get(self.tournament_id)

        if int(score.split(":")[0]) >= t.win_score:
            self.done = True
            self.setWinner(self.teams[0].id)

        if int(score.split(":")[1]) >= t.win_score:
            self.done = True
            self.setWinner(self.teams[1].id)
        
        db.session.commit()
    
    def setWinner(self, team_id):
        self.winner = team_id
        
        tour = Tournament.query.get(self.tournament_id)
        tour.addTeamToNextPhase(team_id, self.phase + 1)

        db.session.commit()
    def __repr__(self) -> str:
        return (f"<Match {self.id} TOURNAMENT: {self.tournament_id} AGREED: {self.agreed} DONE: {self.done} |"
                f"WINNER: {self.winner} TEAMS: {[team.name for team in self.teams]}"
                f"| SCORE: {self.score} | PHASE: {self.phase} | Users: {[user.id for user in self.users]}>"
        )

class DBHelper:
    db = db

    @classmethod
    def authToken(cls, token):
        token = cls.db.session.query(AuthToken).filter_by(token=token).first()

        if not token:
            return False
        
        if datetime.timestamp(token.created_at) + 3600 > int(time.time()):
            db.session.delete(token)
            db.session.commit()
            return None
        
        return token.user
    
    @classmethod
    def deleteToken(cls, user):
        cls.db.session.query(AuthToken).filter_by(user_id=user.id).delete()
        cls.db.session.commit()

    @classmethod
    def authUser(cls, username, password):
        user = cls.db.session.query(User).filter_by(username=username).first()

        if user and user.password == password:
            token = str(uuid.uuid4())
            cls.db.session.add(AuthToken(token=token, user_id=user.id))
            cls.db.session.commit()
            return token, user.id
        
        return None, None

    @classmethod
    def createUser(cls, username, password, role):
        user = cls.db.session.query(User).filter_by(username=username).first()

        if user:
            return False
        
        user = User(username=username, password=password, role=role)

        cls.db.session.add(user)
        cls.db.session.commit()

        return True
    
    @classmethod
    def createTeam(cls, name, user):
        team = cls.db.session.query(Team).filter_by(name=name).first()

        if team:
            return False
        
        team = Team(name=name, cap=user.id)
        
        cls.db.session.add(team)
        cls.db.session.commit()

        user.team_id = team.id

        print('TD', user.team_id)

        cls.db.session.commit()

        return True

    @classmethod
    def addInTeam(cls, team, user):
        team.addUser(user)
    
    @classmethod
    def createMatch(cls, team1_id, team2_id, tournament_id, phase):
        team1 = cls.db.session.query(Team).filter_by(id=team1_id).first()
        team2 = cls.db.session.query(Team).filter_by(id=team2_id).first()

        if not(team1 and team2):
            return False

        match = Match(teams=[team1, team2], tournament_id=tournament_id, phase=phase)
        cls.db.session.add(match)

        cls.db.session.commit()

        return True
    
    @classmethod
    def addTeamToTournament(cls, tour_id, team_id):
        tour = Tournament.query.get(tour_id)
        tour.teams.append(Team.query.get(team_id))
        tour.addTeamToNextPhase(team_id, 0, True)

        cls.db.session.commit()

        return True

    @classmethod
    def createTournament(cls, name, userId, max_teams, size, difficulty, win_score, start_date, cover):
        tournament = cls.db.session.query(Tournament).filter_by(name=name).first()

        if tournament:
            return False
        
        tournament = Tournament(name=name, cover=cover if cover else "placeholder_tour.jpg", start_date=start_date, size=size, difficulty=difficulty, win_score=win_score, org=userId, max_teams=max_teams, brackets=str({str(i): [] for i in range(int(math.floor(math.log(max_teams,2))))}))
        
        cls.db.session.add(tournament)
        cls.db.session.commit()

        return True
    
    @classmethod
    def createInvite(cls, userId, teamId, ownerId):
        invite = Invite(user_id=userId, team_id=teamId, owner_id = ownerId)
        cls.db.session.add(invite)

        cls.db.session.commit()

        return True

    @classmethod
    def removeFromTeam(cls, user, team):
        team.users.remove(user)
        
        cls.db.session.commit()
    
    @classmethod
    def removeTeam(cls, user, team):
        team.users.remove(user)
        team.cap = None

        cls.db.session.commit()



    
            