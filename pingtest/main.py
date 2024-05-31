from fastapi import FastAPI, Path, Query, HTTPException, status, Depends
from typing import Optional, List, Tuple
from pydantic import BaseModel,Field
import mysql.connector
from mysql.connector import Error
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
import jwt
from jwt.exceptions import InvalidTokenError, PyJWTError
from datetime import datetime, timedelta, timezone
import socket
import ssl
import time
import subprocess
import os

os.environ['PATH'] += r';C:\Program Files (x86)\Nmap'




app = FastAPI()



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    password: str
    disabled: Optional[bool] = False
    email: str

class UserInDB(User):
    hashed_password: str
    email: str = Field(..., alias="email") 

class UserSignup(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Url(BaseModel):
    url: str
    nom: str
    protocole: str
    qualite_signal: str
    mode_connexion: str
    domain: bool
    verify_ssl: bool
    method: str

class CodeHttp(BaseModel):
    num_code: int

class Port(BaseModel):
    port:int

class InfoPort(BaseModel):
    port_id:int
    service:str
    status: str
    latency:int
    updatedAt: datetime



def create_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='octaedra_servers',
            user='root',
            password=''
        )
        if connection.is_connected():
            print('Connexion à MySQL établie avec succès.')
            return connection
    except Error as e:
        print(f'Erreur lors de la connexion à MySQL : {e}')
        return None
    

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


SECRET_KEY = "3a335659ed2f3c367f811ecb6d994224160ad2890c91e4869f8cf6776d1adf35"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES= 30


@app.get('/urls')
async def get_urls():
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        select_query = "SELECT * from url"
        cursor.execute(select_query)
        urls = cursor.fetchall()
        cursor.close()
        connection.close()
        urls_json = [{"id": row[0], 
                      "url": row[1],
                      "nom": row[2],
                      "protocole": row[3],
                      "qualite_signal":row[4],
                      "mode_connexion": row[5],
                      "domain":row[6],
                      "verify_ssl": row[7],
                      "method": row[8]
                      } for row in urls]
        return urls_json
    else:
        return {"Error" : "Erreur de recuperation des urls depuis la base de données ."}
    

    
@app.get('/get-url/{id_url}')
async def get_url_by_id(id_url: int):
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        select_query = f"SELECT * from url where id_url={id_url}"
        cursor.execute(select_query)
        url = cursor.fetchone()
        cursor.close()
        connection.close()
        if url:
            return {"id": url[0], 
                      "url": url[1],
                      "nom": url[2],
                      "protocole": url[3],
                      "qualite_signal":url[4],
                      "mode_connexion": url[5],
                      "domain":url[6],
                      "verify_ssl": url[7],
                      "method": url[8]
                      }
        else:
            return {
                "Error": "L'URL avec l'ID spécifié n'existe pas."
                }
    else:
        return {
            "Error": "Erreur de récupération des données depuis la base de données."
            }
    
    

@app.get('/get-codehttp/{id_url}')
async def get_codehttp_by_id(id_url: int):
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        select_query = """SELECT * 
                          FROM code_http
                          INNER JOIN url_code ON code_http.id_code = url_code.id_code
                          WHERE url_code.id_url = %s """
        cursor.execute(select_query,(id_url,))
        code_http = cursor.fetchone()
        cursor.close()
        connection.close()
        if code_http:
            return {
                "id":code_http[0],
                "num_code":code_http[1]
            }
        else:
            return{
                "Error": "Le code http avec l'ID spécifié n'existe pas "
            }
    else:
        return {
            "Error":"Erreur de récuperation des données depuis la base de données"
        }


def scan_ports(adress_url: str) -> List[Port]:
    command = f"nmap -p- {adress_url}"

    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            open_ports = []
            info_ports = []
            for line in result.stdout.split('\n'):
                if '/tcp' in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        port_number = int(parts[0].split('/')[0])
                        open_ports.append(Port(port=port_number))
            return open_ports
        else:
            print(f"Erreur lors de l'exécution de la commande nmap sur {adress_url}: {result.stderr}")
            return []

    except subprocess.TimeoutExpired:
        print(f"Nmap a pris trop de temps pour scanner : {adress_url}")
        return []

    except Exception as e:
        print(f"Erreur lors du scan de {adress_url} : {e}")
        return []
    


def check_ports_status(adress_url: str, ports: List[int]) -> List[Tuple[int, str, float, str]]:
    ports_str = ",".join(map(str, ports))
    command = f'nmap -p {ports_str} {adress_url}'

    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            port_statuses = []
            host_latency = 0.0

             
            for line in result.stdout.split('\n'):
                if "Host is up" in line:
                    parts = line.split()
                    for part in parts:
                        if part.endswith("s"):
                            print(part)
                            # Supprimer tous les caractères non numériques de la latence
                            latency_str = ''.join(c for c in part if c.isdigit() or c == '.')  # Conserver les chiffres et le point
                            print(latency_str)
                            if latency_str:  # Vérifier si la chaîne n'est pas vide
                                if latency_str.startswith('0') and '.' not in latency_str:
                                    # Si la latence commence par 0 et ne contient pas de point,
                                    # alors nous ajoutons un point après le premier caractère
                                    latency_str = latency_str[0] + '.' + latency_str[1:]
                                host_latency = float(latency_str) * 1000  # Convertir en millisecondes
                                print(host_latency)
                                break


            for line in result.stdout.split('\n'):
                if '/tcp' in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        port_number = int(parts[0].split('/')[0])
                        status = parts[1]
                        service = parts[2] if len(parts) > 2 else "unknown"
                        port_statuses.append((port_number, status, host_latency, service))

            return port_statuses
        else:
            print(f"Erreur lors de l'execution de la commande nmap sur {adress_url} : {result.stderr}")
            return []
    except subprocess.TimeoutExpired:
        print(f"Nmap a pris trop de temps pour vérifier : {adress_url}")
        return []

    except Exception as e:
        print(f"Erreur lors de la vérification de {adress_url} : {e}")
        return []


@app.post('/check-ports/{url_id}')
async def check_and_update_ports(url_id: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            select_query = "SELECT url FROM url WHERE id_url = %s"
            cursor.execute(select_query, (url_id,))
            url = cursor.fetchone()
            if not url:
                raise HTTPException(status_code=404, detail="URL not found")
            
            adress_url = url[0]

            cursor.execute("""
                SELECT p.port FROM port p
                JOIN serveurPort sp ON p.id_port = sp.id_port
                WHERE sp.id_url = %s
            """, (url_id,))

            ports = cursor.fetchall()
            ports_list = [port[0] for port in ports]

            if not ports_list:
                raise HTTPException(status_code=404, detail="No ports found")

            port_statuses = check_ports_status(adress_url, ports_list)

            if not port_statuses:
                raise HTTPException(status_code=500, detail="Error checking ports")
            
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            for port_number, status, latency, service in port_statuses:
                cursor.execute("SELECT id_port FROM port WHERE port = %s", (port_number,))
                port_id = cursor.fetchone()

                if port_id:
                    port_id = port_id[0]
                    cursor.execute("""
                        INSERT INTO infoPort (port_id, status, latency, service, updatedAt)
                        VALUES (%s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            status = VALUES(status),
                            latency = VALUES(latency),
                            service = VALUES(service),
                            updatedAt = VALUES(updatedAt)
                    """, (port_id, status, latency, service, current_time))

            connection.commit()
            return {"message": "Ports checked and information updated"}
        
        except mysql.connector.Error as err:
            print(f"Erreur MySQL: {err}")
            connection.rollback()
            raise HTTPException(status_code=500, detail="Database error")
        
        finally:
            cursor.close()
            connection.close()

    else:
        raise HTTPException(status_code=500, detail="Cannot connect to the database, please try again")



@app.post('/scan-ports/{url_id}')
async def scan_ports_by_url_id(url_id: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            select_query = "SELECT url FROM url WHERE id_url = %s"
            cursor.execute(select_query, (url_id,))
            url = cursor.fetchone()
            if not url:
                raise HTTPException(status_code=404, detail="URL not found")
            
            adress_url = url[0]
            open_ports = scan_ports(adress_url)

            if open_ports is None:
                raise HTTPException(status_code=500, detail="Error scanning ports")

            for port in open_ports:
                cursor.execute("SELECT id_port FROM port WHERE port = %s", (port.port,))
                port_id = cursor.fetchone()
                
                if port_id is None:
                    cursor.execute("INSERT INTO port (port) VALUES (%s)", (port.port,))
                    port_id = cursor.lastrowid
                else:
                    port_id = port_id[0]
                
                cursor.execute("INSERT INTO serveurPort (id_url, id_port) VALUES (%s, %s)", (url_id, port_id))

            connection.commit()
            return {"message": "Scan completed and ports inserted"}

        except mysql.connector.Error as err:
            print(f"Erreur MySQL: {err}")
            connection.rollback()
            raise HTTPException(status_code=500, detail="Database error")
        
        finally:
            cursor.close()
            connection.close()

    else:
        raise HTTPException(status_code=500, detail="Cannot connect to the database")


    
@app.post('/add-url')
def add_url(url: Url):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            insert_query = "INSERT into url (url, nom, protocole, qualite_signal, mode_connexion, domain, verify_ssl, method) values (%s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(insert_query, (
                url.url,
                url.nom,
                url.protocole, 
                url.qualite_signal, 
                url.mode_connexion,
                url.domain,
                url.verify_ssl,
                url.method
                ))
            connection.commit()
            url_id = cursor.lastrowid
            cursor.close()
            connection.close()
            return {"id": url_id, "message": f"{url.url} correctement ajoutée à la base de données"}
        except Error as e:
            return HTTPException(status_code=500, detail=f"Erreur lors de l'ajout à la base de données : {e}")
    else:
        return HTTPException(status_code=500, detail="Erreur de connexion à la base de données.")
    

    

@app.post('/add-codehttp/{url_id}')
def add_code_http(codehttp: CodeHttp, url_id: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()

            select_query = "SELECT id_code FROM code_http WHERE num_code = %s"
            cursor.execute(select_query, (codehttp.num_code,))
            existing_code = cursor.fetchone()

            if existing_code:
                code_id = existing_code[0]
            else:
                insert_query = "INSERT INTO code_http (num_code) VALUES (%s)"
                cursor.execute(insert_query, (codehttp.num_code,))
                connection.commit()

                code_id = cursor.lastrowid

            insert_relation_query = "INSERT INTO url_code (id_url, id_code) VALUES (%s, %s)"
            cursor.execute(insert_relation_query, (url_id, code_id))
            connection.commit()

            cursor.close()
            connection.close()
            return {"message": "Code HTTP ajouté avec succès."}
        except Error as e:
            return HTTPException(status_code=500, detail=f"Erreur lors de l'ajout à la base de données : {e}")
    else:
        return HTTPException(status_code=500, detail="Erreur de connexion à la base de données.")
    


@app.put('/update-url/{id_url}')
def update_url(id_url: int, url: Url):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            update_query = "UPDATE url SET url=%s WHERE id_url=%s"
            cursor.execute(update_query,(url.url, id_url))
            connection.commit()
            cursor.close()
            connection.close()
            return {"message": f"URL avec l'ID {id_url} mise à jour avec succès dans la base de données."}
        except Error as e:
            return HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de l'URL dans la base de données : {e}")
    else:
        return HTTPException(status_code=500, detail="Erreur de connexion à la base de données.")
    


@app.delete('/delete-url/{id_url}')
def delete_url(id_url: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            
            get_ports_query = "SELECT id_port FROM serveurport WHERE id_url = %s"
            cursor.execute(get_ports_query, (id_url,))
            ports = cursor.fetchall()
            
            delete_serveurport_query = "DELETE FROM serveurport WHERE id_url = %s"
            cursor.execute(delete_serveurport_query, (id_url,))
            
            for port_id in ports:
                delete_port_query = "DELETE FROM port WHERE id_port = %s"
                cursor.execute(delete_port_query, (port_id[0],))
            
            get_code_query = "SELECT id_code FROM url_code WHERE id_url = %s"
            cursor.execute(get_code_query, (id_url,))
            codes = cursor.fetchall()
            
            delete_url_code_query = "DELETE FROM url_code WHERE id_url= %s"
            cursor.execute(delete_url_code_query, (id_url,))
            
            for code_id in codes:
                delete_code_query = "DELETE FROM code_http WHERE id_code = %s"
                cursor.execute(delete_code_query, (code_id[0],))
            
            delete_query = "DELETE FROM url WHERE id_url = %s"
            cursor.execute(delete_query, (id_url,))
            
            if cursor.rowcount == 0:
                raise Exception(f"L'URL avec l'ID {id_url} n'existe pas dans la base de données.")
            
            connection.commit()
            cursor.close()
            connection.close()
            return {"message": f"URL avec l'ID {id_url} supprimée avec succès de la base de données."}
        except Error as e:
            connection.rollback()
            return HTTPException(status_code=500, detail=f"Erreur lors de la suppression de l'URL dans la base de données : {e}")
    else:
        return HTTPException(status_code=500, detail="Erreur de connexion à la base de données.")




def check_port_latency(ip: str, port: int, timeout: float = 1.0) -> float:
    """Retourne la latence pour se connecter à un port spécifique en millisecondes, ou -1 si le port est fermé."""
    start_time = time.time()
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            latency = (time.time() - start_time) * 1000  
            return latency
    except (socket.timeout, ConnectionRefusedError):
        return -1.0


    

@app.get('/ports/{id_url}')
def get_ports_by_url(id_url: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            select_query =  """ SELECT port.id_port, port.port
                                FROM port 
                                INNER JOIN serveurPort ON port.id_port = serveurPort.id_port
                                WHERE serveurPort.id_url = %s"""
            cursor.execute(select_query, (id_url,))
            ports = cursor.fetchall()
            port_list = []
            for port in ports:
                port = {
                    "id_port": port[0],
                    "port": (port[1].split('/')[0]),
                }
                port_list.append(port)


            cursor.close()
            connection.close()
            
            return port_list
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de la recupération des ports dans la base de données: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail="Erreur de connexion à la base de données")
    

@app.get('/number-of-ports/{id_url}')
def get_number_of_ports_by_url(id_url: int):
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            select_query = """SELECT COUNT(*)
                              FROM port 
                              INNER JOIN serveurPort ON port.id_port = serveurPort.id_port
                              WHERE serveurPort.id_url = %s"""
            cursor.execute(select_query, (id_url,))
            result = cursor.fetchone()  
            cursor.close()
            connection.close()
            number_of_ports = result[0]
            if result:
                return number_of_ports
            else:
                return {"error": "Aucun port trouvé pour cette URL"}
        except Error as e:
            return HTTPException(status_code=500, detail="Erreur lors de la récupération des ports dans la base de données")
    else:
        return HTTPException(status_code=500, detail="Erreur de connexion à la base de données")

    




def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user_from_db(username: str):
    try:
        connection = create_connection()
        cursor = connection.cursor()
        select_query = "SELECT username, password, email FROM user WHERE username = %s"
        cursor.execute(select_query, (username,))
        user_data = cursor.fetchone()
        cursor.close()
        connection.close()
        if user_data:
            user_dict = {
                "username": user_data[0],
                "password": user_data[1],  
                "hashed_password": user_data[1],
                "email": user_data[2] 
            }
            return UserInDB(**user_dict)
        else:
            return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user from database: {str(e)}")


def authenticate_user( username: str, password: str):
    user = get_user_from_db(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user( form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except PyJWTError:
        raise credentials_exception
    user = get_user_from_db(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


class UserOut(BaseModel):
    username: str


@app.post("/register", response_model=UserOut)
async def register(user: UserSignup):
    existing_user = get_user_from_db(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = pwd_context.hash(user.password)
    
    try:
        connection = create_connection()
        cursor = connection.cursor()
        insert_query = "INSERT INTO user (username, password, disabled, email) VALUES (%s, %s, %s, %s)"
        cursor.execute(insert_query, (user.username, hashed_password, False, user.email))
        connection.commit()
        cursor.close()
        connection.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")
    
    return {"username":user.username}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)