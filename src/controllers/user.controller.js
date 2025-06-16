import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import cloudinaryUpload from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res)=>{

   // get user details from frontend
   // validation — not empty
   // check if user already exists: username, email
   // check for images, check for avatar
   // upload them to cloudinary, avatar
   // create user object — create entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return res

   const { fullName, username, email, password } = req.body;
   
   const isEmpty = [fullName, username, email, password].some((field) =>
      field?.trim() === ""
   )

   if(isEmpty){
      throw new ApiError(408, "required fields are empty");
   }

   const existedUser = await User.findOne({
      $or : [{ username }, { email }]
   })

   if(existedUser){
      throw new ApiError(409, "User with email and username already exists")
   }
   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage?.[0]?.path ?? null;
   
   if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is required");
   }

   const avatar = await cloudinaryUpload(avatarLocalPath);
   const coverImage = await cloudinaryUpload(coverImageLocalPath);
   if(!avatar) {
      throw new ApiError(501, "something went wrong avatar uploading failed")
   }
   
   const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if(!createdUser){
      throw new ApiError(500, "something went wrong while registering the user");
   }

   return res.status(201).json(
      new ApiResponse(200, createdUser, "User registered Successfully")
   )

})

export {registerUser} ;