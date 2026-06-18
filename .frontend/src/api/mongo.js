import { API } from './config'
import { http } from './http'

const base = API.mongo

export const mongo = {
  // ---- usuarios ----
  searchUsers: (q) => http(`${base}/users/search?q=${encodeURIComponent(q)}`),
  usersByInterest: (interest) => http(`${base}/users/interest/${encodeURIComponent(interest)}`),
  getUser: (username) => http(`${base}/users/${encodeURIComponent(username)}`),
  getUserStats: (userId) => http(`${base}/users/${encodeURIComponent(userId)}/stats`),
  createUser: (body) => http(`${base}/users/`, { method: 'POST', body }),
  updateUser: (userId, body) => http(`${base}/users/${encodeURIComponent(userId)}`, { method: 'PUT', body }),

  // ---- posts ----
  searchPosts: (q) => http(`${base}/posts/search?q=${encodeURIComponent(q)}`),
  postsByTag: (tag, limit = 20) => http(`${base}/posts/tag/${encodeURIComponent(tag)}?limit=${limit}`),
  trendingPosts: (limit = 10) => http(`${base}/posts/trending?limit=${limit}`),
  postsByUser: (userId, page = 1, limit = 10) =>
    http(`${base}/posts/user/${encodeURIComponent(userId)}?page=${page}&limit=${limit}`),
  getPost: (postId) => http(`${base}/posts/${encodeURIComponent(postId)}`),
  createPost: (body) => http(`${base}/posts/`, { method: 'POST', body }),
  likePost: (postId) => http(`${base}/posts/${encodeURIComponent(postId)}/like`, { method: 'PATCH' }),
}
