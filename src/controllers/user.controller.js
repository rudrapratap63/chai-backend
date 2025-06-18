import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import cloudinaryUpload from "../utils/cloudinary.js";


const generateAccessTokenAndRefreshToken = async (userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeState: false })
      return {accessToken, refreshToken};
   } catch (error) {
      throw new ApiError(500, "something went wrong while generating access token and refresh token");
   }
}

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

const loginUser = asyncHandler(async (req, res) => {
   // req body —> data
   // username or email
   // find the user on db that user exist or not
   // password check ( compare password in db that password correct or not )
   // generate access and referesh token
   // send cookie  

   const {username, password, email} = req.body;
   if(!(username || email)){
      throw new ApiError(400, "username and email are required");
   }

   if(!password){
      throw new ApiError(400, "Password is required");
   }

   const user = await User.findOne({
      $or : [{username}, {email}]
   })

   if(!user){
      throw new ApiError(401, "user not exist");
   }

   const isPasswordValid = await user.isPasswordCorrect(password);
   if(!isPasswordValid){
      throw new ApiError(403, "password is incorrect");
   }

   const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {
            user : loggedInUser,
            accessToken, refreshToken
         },
         "User logged in successfully"
      )
   )
})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset : { refreshToken : "" }
      },
      {
         new : true
      }
   )
   const options = {
      httpOnly : true,
      secure : true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "user logged out"))

})

export { registerUser, loginUser, logoutUser } ;