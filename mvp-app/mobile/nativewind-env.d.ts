/// <reference types="nativewind/types" />

// TypeScript 6 báo lỗi import CSS không có khai báo kiểu; global.css do NativeWind xử lý lúc build.
declare module "*.css"
