const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Configure Google OAuth strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5500/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Extract emails and name from Google profile
                const emails = profile.emails?.map(e => e.value) || [];
                const firstname = profile.name?.givenName || "User";
                const lastname = profile.name?.familyName || "Unknown";

                if (emails.length === 0) {
                    // Fail if no email is returned by Google
                    return done(new Error("No emails found in Google profile"), null);
                }

                // Pass the essential user info to the next step in Passport
                return done(null, {
                    googleId: profile.id,
                    firstname,
                    lastname,
                    emails,
                });
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Store user info in session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
