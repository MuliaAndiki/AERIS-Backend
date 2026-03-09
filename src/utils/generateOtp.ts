export function generateOtp(lenght: number = 6): string {
  const digit = "0123456789";
  let otp = "";
  for (let i = 0; i < lenght; i++) {
    otp += digit[Math.floor(Math.random() * 10)];
  }
  return otp;
}
