import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Loader2, MailOpen } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyauthentication } from "../services/authenticationService";
import { getDefaultCompanyName } from "../services/dmsService";
import {
    getEmployeeImage,
    getEmployeeNameAndId,
} from "../services/employeeService";
import { doConnectionPublic, getServiceURL } from "../services/publicService";
import { getNameFromEmail } from "../utils/emailHelpers";
import { Checkbox } from "@/components/ui/checkbox"
import Lottie from 'react-lottie';
import animationData from "@/lotties/crm-animation-lotties.json";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const SignUpPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [userType, setUserType] = useState("");
    const [gstNo, setGstNo] = useState("");
    const [acknowledged, setAcknowledged] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { login, setUserData } = useAuth();

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: "xMidYMid slice"
        }
    };

    // Memoized login handler to prevent re-creation on each render.
    const handleSignup = useCallback(
        async (e) => {
            e.preventDefault();
            setLoading(true);
            setError("");

            if (!email) {
                setError("Username is required!");
                setLoading(false);
                return;
            } else if (!password) {
                setError("Password is required!");
                setLoading(false);
                return;
            }

            try {
                // Step 1: Connect to public service.
                const publicConnection = await doConnectionPublic(email);
                if (publicConnection === "Invalid domain on Client Connection Data") {
                    setError(publicConnection);
                    setLoading(false);
                    return;
                }

                // Step 2: Retrieve dynamic client URL.
                const clientURL = await getServiceURL(email);
                if (!clientURL || !clientURL.startsWith("http")) {
                    setError("Failed to retrieve a valid client URL.");
                    setLoading(false);
                    return;
                }

                // Step 2: Verify authentication.
                const userName = getNameFromEmail(email);
                const userDetails = { User: userName, Pass: password };
                const authentication = await verifyauthentication(
                    userDetails,
                    email,
                    clientURL
                );

                if (authentication !== "Authetication passed") {
                    setError(authentication);
                    setLoading(false);
                    return;
                }

                // Optionally update userData with the client URL immediately.
                setUserData((prev) => ({ ...prev, clientURL: clientURL }));

                const employeeData = await getEmployeeNameAndId(
                    userName,
                    email,
                    clientURL
                );

                if (!employeeData || !employeeData.length) {
                    setError("Employee details not found.");
                    setLoading(false);
                    return;
                }

                const empNo = employeeData[0].EMP_NO;

                let employeeImage = null;
                if (empNo) {
                    employeeImage = await getEmployeeImage(empNo, email, clientURL);
                }

                const organization = await getDefaultCompanyName("", email, clientURL);

                const payload = {
                    token: "dummy-token",
                    email,
                    organization: organization,
                    currentUserLogin: email,
                    currentUserName: employeeData[0].USER_NAME,
                    currentUserEmpNo: empNo,
                    currentUserImageData:
                        employeeImage !== null
                            ? `data:image/jpeg;base64,${employeeImage}`
                            : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbBa24AAg4zVSuUsL4hJnMC9s3DguLgeQmZA&s",

                    clientURL: clientURL,
                };

                // Call login from context. It will handle splitting the payload.
                login(payload);

                navigate("/");
            } catch (err) {
                console.error("Login error:", err);
                setError("Login failed. Please try again.");
            } finally {
                setLoading(false);
            }
        },
        [email, password, login, setUserData, navigate]
    );
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
            <div className="hidden lg:flex flex-col justify-between p-10 bg-slate-200 dark:bg-slate-900">
                <div>
                    <img
                        src={logoLight}
                        alt="iStreams ERP Solutions | CRM"
                        className="dark:hidden"
                    />
                    <img
                        src={logoDark}
                        alt="iStreams ERP Solutions | CRM"
                        className="hidden dark:block"
                    />
                </div>

                <div>
                    <Lottie
                        options={defaultOptions}
                        height={350}
                        width={400}
                    />
                </div>


                <div>
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;Manage your customers efficiently and streamline your business operations with our powerful CRM system.&rdquo;
                        </p>

                        <footer className="text-sm text-gray-400">- iStreams ERP Solutions</footer>
                    </blockquote>
                </div>
            </div>
            <div className="flex flex-col justify-center lg:p-8 bg-slate-100 dark:bg-slate-950 px-6 overflow-y-auto">
                <div className="mx-auto flex w-full flex-col justify-center gap-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Create an account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your details below to create your account
                        </p>
                    </div>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid w-full items-center gap-4">
                            {/* Name Field */}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    name="name"
                                    id="name"
                                    placeholder="Your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Email Field */}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="email">Email ID</Label>
                                <Input
                                    name="email"
                                    id="email"
                                    placeholder="username@domain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Type Selection */}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="type">Type</Label>
                                <Select onValueChange={(value) => setUserType(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="individual">Individual</SelectItem>
                                            <SelectItem value="business">Business</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* GST NO Field */}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="gstNo">GST NO</Label>
                                <Input
                                    name="gstNo"
                                    id="gstNo"
                                    placeholder="Your GST Number"
                                    value={gstNo}
                                    onChange={(e) => setGstNo(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Field */}
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="flex gap-2 relative">
                                    <Input
                                        name="password"
                                        id="password"
                                        placeholder="*******"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <span
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="terms"
                                    checked={acknowledged}
                                    onChange={(e) => setAcknowledged(e.target.checked)}
                                />
                                <label
                                    htmlFor="terms"
                                    className="text-sm font-medium leading-none"
                                >
                                    I acknowledge and agree to collaborate in iStreams
                                </label>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500 text-white p-2 mb-4 rounded">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Please wait
                                </>
                            ) : (
                                "Sign Up"
                            )}
                        </Button>
                        <p className="text-xs text-gray-400 text-center">
                            Already have an account?{" "}
                            <Link to="/login" className="text-blue-500">Log in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default SignUpPage
