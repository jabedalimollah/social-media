import ApiError from "../utils/ApiError.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import getDataURI from "../utils/datauri.js";
import { Post } from "../models/post.model.js";
import { cloudinary } from "../utils/cloudinary.js";

// =================== Register ===================
const register = asyncErrorHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new ApiError(401, "error", "Something is missing, please check");
  }
  const checkUserName = await User.findOne({ username });
  const checkEmail = await User.findOne({ email });
  // ------------------ check duplicate username and email ------------------
  if (checkUserName) {
    // ------------------ throwing error in ApiError.js file ------------------
    throw new ApiError(400, "error", "username already exists");
  } else if (checkEmail) {
    throw new ApiError(400, "error", "email already exists");
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = await User.create({
      username,
      email,
      password: hashedPassword,
    });
    // ------------- Password Remove ---------
    const userData = data.toObject();
    delete userData.password;
    res
      .status(200)
      .json(new ApiResponse(200, userData, "Account created successfully"));
  }
});

// =============== Login =================
const login = asyncErrorHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(401, "error", "Something is missing, please check");
  }

  const user = await User.findOne({ email });
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!user || !isPasswordMatch) {
    throw new ApiError(401, "error", "Incorrect email or password");
  }
  const payload = {
    userId: user._id,
  };
  const token = await jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });
  const populatedPosts = await Promise.all(
    user.posts?.map(async (postId) => {
      const post = await Post.findById(postId);
      if (post.author.equals(user._id)) {
        return post;
      }
      return null;
    })
  );
  // ------------- Password Remove ---------
  const userData = user.toObject();
  userData.posts = populatedPosts;
  delete userData.password;
  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, userData, "User login successfully"));
});

// ============= Logout ==============
const logout = asyncErrorHandler(async (req, res) => {
  return res
    .status(200)
    .cookie("token", "", { maxAge: 0 })
    .json(new ApiResponse(200, null, "User logout successfully"));
});

// ================= Get Profile =================
const getProfile = asyncErrorHandler(async (req, res) => {
  const userId = req.params.id;
  let user = await User.findById(userId).select("-password");
  return res.status(200).json(new ApiResponse(200, user, "Success"));
});

// ================== Update Profile =============
const updateProfile = asyncErrorHandler(async (req, res) => {
  const userId = req.id;
  const { bio, gender } = req.body;
  const profilePicture = req.file;
  let cloudinaryResponse;
  if (profilePicture) {
    const fileUri = getDataURI(profilePicture);
    // cloudinaryResponse = await uploadOnCloudinary(fileUri);
    cloudinaryResponse = await cloudinary.uploader.upload(fileUri);
  }
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "error", "User not found");
  }

  if (bio) user.bio = bio;
  if (gender) user.gender = gender;
  if (profilePicture) user.profilePicture = cloudinaryResponse.secure_url;
  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile update successfully"));
});

// ====================== Suggested User =======================
const getSuggestedUsers = asyncErrorHandler(async (req, res) => {
  const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select(
    "-password"
  );
  if (!suggestedUsers) {
    throw new ApiError(400, "error", "Currently do not have any users");
  }
  return res.status(200).json(new ApiResponse(200, suggestedUsers, "Success"));
});

// =================== Follow and Unfollow ====================
const followAndUnfollow = asyncErrorHandler(async (req, res) => {
  const userId = req.id;
  const followingUser = req.params.id;
  if (userId === followingUser) {
    throw new ApiError(400, "error", "You can't follow/unfollow yourself");
  }
  const user = await User.findById(userId);
  const targetUser = await User.findById(followingUser);
  if (!user || !targetUser) {
    throw new ApiError(400, "error", "User not found");
  }
  const isFollowing = user.following.includes(followingUser);
  if (isFollowing) {
    await Promise.all([
      User.updateOne({ _id: userId }, { $pull: { following: followingUser } }),
      User.updateOne({ _id: followingUser }, { $pull: { followers: userId } }),
    ]);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unfollowed Successfully"));
  } else {
    await Promise.all([
      User.updateOne({ _id: userId }, { $push: { following: followingUser } }),
      User.updateOne({ _id: followingUser }, { $push: { followers: userId } }),
    ]);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Followed Successfully"));
  }
});

// ========== Export ==========
export {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  getSuggestedUsers,
  followAndUnfollow,
};
