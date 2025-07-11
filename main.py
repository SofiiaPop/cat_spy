from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from contextlib import contextmanager
import requests

app = FastAPI(title="Spy Cat Agency API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "spy_cats.db"

class SpyCatCreate(BaseModel):
    name: str
    years_of_experience: int
    breed: str
    salary: float

class SpyCatUpdate(BaseModel):
    salary: float

class SpyCatResponse(BaseModel):
    id: int
    name: str
    years_of_experience: int
    breed: str
    salary: float

class TargetCreate(BaseModel):
    name: str
    country: str
    notes: Optional[str] = ""

class MissionCreate(BaseModel):
    targets: List[TargetCreate]

class MissionAssign(BaseModel):
    cat_id: int

class TargetUpdate(BaseModel):
    notes: Optional[str] = None
    complete: Optional[bool] = None

def init_db():
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS spy_cats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            years_of_experience INTEGER NOT NULL,
            breed TEXT NOT NULL,
            salary REAL NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS missions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cat_id INTEGER,
            complete BOOLEAN DEFAULT 0,
            FOREIGN KEY (cat_id) REFERENCES spy_cats (id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mission_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            notes TEXT DEFAULT '',
            complete BOOLEAN DEFAULT 0,
            FOREIGN KEY (mission_id) REFERENCES missions (id)
        )
    ''')
    
    conn.commit()
    conn.close()

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def validate_cat_breed(breed):
    """Validate cat breed using TheCatAPI"""
    try:
        response = requests.get("https://api.thecatapi.com/v1/breeds", timeout=10)
        if response.status_code == 200:
            breeds = response.json()
            breed_names = [b['name'].lower() for b in breeds]
            return breed.lower() in breed_names
        return False
    except Exception:
        return False

init_db()

@app.post("/spy-cats/", response_model=SpyCatResponse)
def create_spy_cat(spy_cat: SpyCatCreate):
    if not validate_cat_breed(spy_cat.breed):
        raise HTTPException(status_code=400, detail="Invalid cat breed")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO spy_cats (name, years_of_experience, breed, salary)
            VALUES (?, ?, ?, ?)
        ''', (spy_cat.name, spy_cat.years_of_experience, spy_cat.breed, spy_cat.salary))
        conn.commit()
        cat_id = cursor.lastrowid
        
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (cat_id,))
        return dict(cursor.fetchone())

@app.get("/spy-cats/", response_model=List[SpyCatResponse])
def list_spy_cats():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM spy_cats')
        return [dict(row) for row in cursor.fetchall()]

@app.get("/spy-cats/{cat_id}", response_model=SpyCatResponse)
def get_spy_cat(cat_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (cat_id,))
        cat = cursor.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail="Spy cat not found")
        return dict(cat)

@app.put("/spy-cats/{cat_id}", response_model=SpyCatResponse)
def update_spy_cat(cat_id, update_data):
    """Update spy cat salary"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (cat_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spy cat not found")
        
        cursor.execute('UPDATE spy_cats SET salary = ? WHERE id = ?', (update_data.salary, cat_id))
        conn.commit()
        
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (cat_id,))
        return dict(cursor.fetchone())

@app.delete("/spy-cats/{cat_id}")
def delete_spy_cat(cat_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (cat_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spy cat not found")
        
        cursor.execute('SELECT * FROM missions WHERE cat_id = ? AND complete = 0', (cat_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete cat with active missions")
        
        cursor.execute('DELETE FROM spy_cats WHERE id = ?', (cat_id,))
        conn.commit()
        return {"message": "Spy cat deleted successfully"}

@app.post("/missions/")
def create_mission(mission_data):
    if len(mission_data.targets) < 1 or len(mission_data.targets) > 3:
        raise HTTPException(status_code=400, detail="Mission must have between 1 and 3 targets")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO missions (complete) VALUES (0)')
        mission_id = cursor.lastrowid
        
        for target in mission_data.targets:
            cursor.execute('''
                INSERT INTO targets (mission_id, name, country, notes)
                VALUES (?, ?, ?, ?)
            ''', (mission_id, target.name, target.country, target.notes))
        
        conn.commit()
        
        cursor.execute('SELECT * FROM missions WHERE id = ?', (mission_id,))
        mission = dict(cursor.fetchone())
        
        cursor.execute('SELECT * FROM targets WHERE mission_id = ?', (mission_id,))
        mission['targets'] = [dict(row) for row in cursor.fetchall()]
        
        return mission

@app.get("/missions/")
def list_missions():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM missions')
        missions = [dict(row) for row in cursor.fetchall()]
        
        for mission in missions:
            cursor.execute('SELECT * FROM targets WHERE mission_id = ?', (mission['id'],))
            mission['targets'] = [dict(row) for row in cursor.fetchall()]
        
        return missions

@app.get("/missions/{mission_id}")
def get_mission(mission_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM missions WHERE id = ?', (mission_id,))
        mission = cursor.fetchone()
        if not mission:
            raise HTTPException(status_code=404, detail="Mission not found")
        
        mission = dict(mission)
        cursor.execute('SELECT * FROM targets WHERE mission_id = ?', (mission_id,))
        mission['targets'] = [dict(row) for row in cursor.fetchall()]
        
        return mission

@app.put("/missions/{mission_id}/assign")
def assign_mission(mission_id, assignment):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM missions WHERE id = ?', (mission_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Mission not found")
        
        cursor.execute('SELECT * FROM spy_cats WHERE id = ?', (assignment.cat_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spy cat not found")
        
        cursor.execute('SELECT * FROM missions WHERE cat_id = ? AND complete = 0 AND id != ?', 
                      (assignment.cat_id, mission_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Cat already has an active mission")
        
        cursor.execute('UPDATE missions SET cat_id = ? WHERE id = ?', (assignment.cat_id, mission_id))
        conn.commit()
        
        return {"message": "Mission assigned successfully"}

@app.delete("/missions/{mission_id}")
def delete_mission(mission_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM missions WHERE id = ?', (mission_id,))
        mission = cursor.fetchone()
        if not mission:
            raise HTTPException(status_code=404, detail="Mission not found")
        
        if mission['cat_id']:
            raise HTTPException(status_code=400, detail="Cannot delete mission assigned to a cat")
        
        cursor.execute('DELETE FROM targets WHERE mission_id = ?', (mission_id,))
        cursor.execute('DELETE FROM missions WHERE id = ?', (mission_id,))
        conn.commit()
        
        return {"message": "Mission deleted successfully"}

@app.put("/targets/{target_id}")
def update_target(target_id, target_update):
    """Update target notes and completion status"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT t.*, m.complete as mission_complete 
            FROM targets t 
            JOIN missions m ON t.mission_id = m.id 
            WHERE t.id = ?
        ''', (target_id,))
        target = cursor.fetchone()
        
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        
        if target['complete'] or target['mission_complete']:
            raise HTTPException(status_code=400, detail="Cannot update completed target or mission")
        
        updates = []
        params = []
        
        if target_update.notes is not None:
            updates.append('notes = ?')
            params.append(target_update.notes)
        
        if target_update.complete is not None:
            updates.append('complete = ?')
            params.append(target_update.complete)
        
        if updates:
            params.append(target_id)
            cursor.execute(f'UPDATE targets SET {", ".join(updates)} WHERE id = ?', params)
            
            if target_update.complete:
                cursor.execute('SELECT * FROM targets WHERE mission_id = ? AND complete = 0', 
                              (target['mission_id'],))
                if not cursor.fetchone():
                    cursor.execute('UPDATE missions SET complete = 1 WHERE id = ?', 
                                  (target['mission_id'],))
            
            conn.commit()
        
        cursor.execute('SELECT * FROM targets WHERE id = ?', (target_id,))
        return dict(cursor.fetchone())

@app.get("/")
def root():
    return {"message": "Spy Cat Agency API is running!", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)