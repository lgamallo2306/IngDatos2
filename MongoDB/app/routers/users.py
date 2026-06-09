from fastapi import APIRouter, HTTPException, Query
from app.database import get_database

router = APIRouter(prefix="/users", tags=["users"])


def serialize(doc) -> dict:
    """Convierte _id de vuelta a user_id para la respuesta."""
    if doc is None:
        return None
    doc["user_id"] = str(doc.pop("_id"))
    return doc


# ─────────────────────────────────────────────
# GET /users/search?q=bautista
# Búsqueda por username o display_name (regex, case-insensitive)
# ─────────────────────────────────────────────
@router.get("/search")
async def search_users(q: str = Query(..., min_length=1)):
    db = get_database()
    cursor = db.users.find(
        {"$or": [
            {"username":     {"$regex": q, "$options": "i"}},
            {"display_name": {"$regex": q, "$options": "i"}},
            {"bio":          {"$regex": q, "$options": "i"}},
        ]},
        {"session": 0}   # no exponemos el token
    ).limit(20)
    results = [serialize(u) async for u in cursor]
    return {"query": q, "count": len(results), "users": results}


# ─────────────────────────────────────────────
# GET /users/interest/:interest
# Todos los usuarios que tienen ese interés
# ─────────────────────────────────────────────
@router.get("/interest/{interest}")
async def users_by_interest(interest: str):
    db = get_database()
    cursor = db.users.find(
        {"interests": interest},
        {"session": 0}
    ).limit(50)
    results = [serialize(u) async for u in cursor]
    return {"interest": interest, "count": len(results), "users": results}


# ─────────────────────────────────────────────
# GET /users/:username
# Perfil completo por username
# ─────────────────────────────────────────────
@router.get("/{username}")
async def get_user(username: str):
    db = get_database()
    user = await db.users.find_one(
        {"username": username},
        {"session": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return serialize(user)


# ─────────────────────────────────────────────
# GET /users/:user_id/stats
# Stats del usuario con aggregation pipeline
# ─────────────────────────────────────────────
@router.get("/{user_id}/stats")
async def get_user_stats(user_id: str):
    db = get_database()

    # Verificar que el usuario existe
    user = await db.users.find_one({"_id": user_id}, {"username": 1, "display_name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$user_id",
            "total_posts":    {"$sum": 1},
            "total_likes":    {"$sum": "$likes_count"},
            "total_comments": {"$sum": "$comments_count"},
            "avg_likes":      {"$avg": "$likes_count"},
            "max_likes":      {"$max": "$likes_count"},
            "tags_used":      {"$push": "$tags"},
        }},
        {"$project": {
            "total_posts":    1,
            "total_likes":    1,
            "total_comments": 1,
            "avg_likes":      {"$round": ["$avg_likes", 1]},
            "max_likes":      1,
            # Aplanar el array de arrays de tags
            "tags_used": {
                "$reduce": {
                    "input": "$tags_used",
                    "initialValue": [],
                    "in": {"$concatArrays": ["$$value", "$$this"]}
                }
            }
        }}
    ]

    result = await db.posts.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_posts": 0, "total_likes": 0, "total_comments": 0,
        "avg_likes": 0, "max_likes": 0, "tags_used": []
    }
    stats.pop("_id", None)

    return {
        "user_id":      user_id,
        "username":     user.get("username"),
        "display_name": user.get("display_name"),
        "stats":        stats
    }


# ─────────────────────────────────────────────
# PUT /users/:user_id
# Actualizar campos del perfil (bio, location, website, settings)
# ─────────────────────────────────────────────
@router.put("/{user_id}")
async def update_user(user_id: str, body: dict):
    db = get_database()

    # Campos que se pueden actualizar
    allowed = {"bio", "location", "website", "display_name",
               "settings", "interests", "avatar_url"}
    update_data = {k: v for k, v in body.items() if k in allowed}

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")

    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    updated = await db.users.find_one({"_id": user_id}, {"session": 0})
    return serialize(updated)
