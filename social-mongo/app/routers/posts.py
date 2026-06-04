from fastapi import APIRouter, HTTPException, Query
from app.database import get_database
from datetime import datetime, timezone

router = APIRouter(prefix="/posts", tags=["posts"])


def serialize(doc) -> dict:
    if doc is None:
        return None
    doc["post_id"] = str(doc.pop("_id"))
    return doc


# ─────────────────────────────────────────────
# GET /posts/search?q=python
# Full-text search sobre el contenido de posts
# ─────────────────────────────────────────────
@router.get("/search")
async def search_posts(q: str = Query(..., min_length=1)):
    db = get_database()
    cursor = db.posts.find(
        {"$text": {"$search": q}},
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).limit(20)

    results = [serialize(p) async for p in cursor]
    return {"query": q, "count": len(results), "posts": results}


# ─────────────────────────────────────────────
# GET /posts/tag/:tag
# Posts que tienen ese tag (índice multikey)
# ─────────────────────────────────────────────
@router.get("/tag/{tag}")
async def posts_by_tag(tag: str, limit: int = Query(20, le=100)):
    db = get_database()
    cursor = db.posts.find(
        {"tags": tag}
    ).sort("created_at", -1).limit(limit)

    results = [serialize(p) async for p in cursor]
    return {"tag": tag, "count": len(results), "posts": results}


# ─────────────────────────────────────────────
# GET /posts/trending
# Posts con más likes (aggregation pipeline)
# ─────────────────────────────────────────────
@router.get("/trending")
async def trending_posts(limit: int = Query(10, le=50)):
    db = get_database()

    pipeline = [
        {"$match": {"visibility": "public"}},
        {"$sort": {"likes_count": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "_id",
            "as": "author",
            "pipeline": [{"$project": {"username": 1, "display_name": 1, "avatar_url": 1}}]
        }},
        {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
    ]

    results = []
    async for doc in db.posts.aggregate(pipeline):
        doc["post_id"] = str(doc.pop("_id"))
        results.append(doc)

    return {"count": len(results), "posts": results}


# ─────────────────────────────────────────────
# GET /posts/user/:user_id
# Posts de un usuario, paginados
# ─────────────────────────────────────────────
@router.get("/user/{user_id}")
async def posts_by_user(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50)
):
    db = get_database()
    skip = (page - 1) * limit

    cursor = db.posts.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit)

    total = await db.posts.count_documents({"user_id": user_id})
    results = [serialize(p) async for p in cursor]

    return {
        "user_id": user_id,
        "total":   total,
        "page":    page,
        "limit":   limit,
        "posts":   results
    }


# ─────────────────────────────────────────────
# GET /posts/:post_id
# Post individual
# ─────────────────────────────────────────────
@router.get("/{post_id}")
async def get_post(post_id: str):
    db = get_database()
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return serialize(post)


# ─────────────────────────────────────────────
# POST /posts
# Crear un post nuevo
# ─────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_post(body: dict):
    db = get_database()

    required = {"user_id", "content"}
    if not required.issubset(body.keys()):
        raise HTTPException(status_code=400, detail=f"Campos requeridos: {required}")

    # Verificar que el usuario existe
    user = await db.users.find_one({"_id": body["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    import uuid
    post = {
        "_id":            str(uuid.uuid4()),
        "user_id":        body["user_id"],
        "content":        body["content"],
        "media_urls":     body.get("media_urls", []),
        "tags":           body.get("tags", []),
        "likes_count":    0,
        "comments_count": 0,
        "visibility":     body.get("visibility", "public"),
        "created_at":     datetime.now(timezone.utc).isoformat(),
    }

    await db.posts.insert_one(post)
    post["post_id"] = post.pop("_id")
    return post


# ─────────────────────────────────────────────
# PATCH /posts/:post_id/like
# Incrementar likes_count en 1
# ─────────────────────────────────────────────
@router.patch("/{post_id}/like")
async def like_post(post_id: str):
    db = get_database()
    result = await db.posts.update_one(
        {"_id": post_id},
        {"$inc": {"likes_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    post = await db.posts.find_one({"_id": post_id})
    return {"post_id": post_id, "likes_count": post["likes_count"]}
