import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import animationData from "@/lotties/crm-animation-lotties.json";
import { callSoapService } from "@/api/callSoapService";
import { Eye, EyeOff, Loader2, Mail,Lock} from "lucide-react";
import { useCallback, useState } from "react";
import Lottie from "react-lottie";
import { Link, useNavigate } from "react-router-dom";
import { getNameFromEmail } from "../utils/emailHelpers";
import istcloudsvideo from "@/assets/istcloudsvid.mp4";

// Use the proxy path for the public service.
const PUBLIC_SERVICE_URL = import.meta.env.VITE_SOAP_ENDPOINT;
const DEFAULT_AVATAR_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbBa24AAg4zVSuUsL4hJnMC9s3DguLgeQmZA&s";

const LoginFormPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lottieOptions = {
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  // Memoized login handler to prevent re-creation on each render.
  const handleLogin = useCallback(
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

      const userData = {
        user: {
          name: getNameFromEmail(email),
          employeeNo: "",
          employeeImage: null,
          isAdmin: false,
        },
        company: {
          name: "",
          logo: "",
          code: "",
        },
        branch: {
          code: "",
          info: null,
        },
        currency: {
          info: null,
        },
        clientURL: "",
      };

      const doConnectionPayload = {
        LoginUserName: email,
      };

      localStorage.setItem("doConnectionPayload", JSON.stringify(doConnectionPayload));

      try {
        const publicDoConnectionResponse = await callSoapService(PUBLIC_SERVICE_URL, "doConnection", doConnectionPayload);

        if (publicDoConnectionResponse === "SUCCESS") {
          userData.clientURL = await callSoapService(PUBLIC_SERVICE_URL, "GetServiceURL", doConnectionPayload);

          const clientDoConnectionResponse = await callSoapService(userData.clientURL, "doConnection", doConnectionPayload);

          if (clientDoConnectionResponse === "SUCCESS") {
            const authenticationPayload = {
              username: userData.user.name,
              password: password,
            };

            const authenticationResponse = await callSoapService(userData.clientURL, "verifyauthentication", authenticationPayload);

            if (authenticationResponse === "Authetication passed") {
              const clientEmpDetailsPayload = {
                userfirstname: userData.user.name,
              };

              const clientEmpDetails = await callSoapService(userData.clientURL, "getemployeename_and_id", clientEmpDetailsPayload);

              userData.user.employeeNo = clientEmpDetails[0]?.EMP_NO;

              if (userData.user.employeeNo) {
                const getEmployeeImagePayload = {
                  EmpNo: userData.user.employeeNo,
                };

                const employeeImageResponse = await callSoapService(userData.clientURL, "getpic_bytearray", getEmployeeImagePayload);

                userData.user.employeeImage = employeeImageResponse ? `data:image/jpeg;base64,${employeeImageResponse}` : DEFAULT_AVATAR_URL;
              }

              userData.company.code = await callSoapService(userData.clientURL, "General_Get_DefaultCompanyCode", "");

              if (userData.company.code) {
                const branchCodePayload = {
                  CompanyCode: userData.company.code,
                };

                userData.branch.code = await callSoapService(userData.clientURL, "General_Get_DefaultBranchCode", branchCodePayload);

                const companyNamePayload = {
                  CompanyCode: userData.company.code,
                  BranchCode: userData.branch.code,
                };

                userData.company.name = await callSoapService(userData.clientURL, "General_Get_DefaultCompanyName", companyNamePayload);

                const companyLogoPayload = {
                  CompanyCode: userData.company.code,
                  BranchCode: userData.branch.code,
                };

                userData.company.logo = await callSoapService(userData.clientURL, "General_Get_CompanyLogo", companyLogoPayload);

                const branchDetailsPayload = {
                  SQLQuery: `SELECT * FROM BRANCH_MASTER WHERE COMPANY_CODE = ${userData.company.code} AND DEFAULT_STATUS = 'T'`,
                };

                const branchInfo = await callSoapService(userData.clientURL, "DataModel_GetDataFrom_Query", branchDetailsPayload);

                userData.branch.info = branchInfo[0];

                if (userData.branch.info?.CURRENCY_NAME) {
                  const currencyDetailsPayload = {
                    SQLQuery: `SELECT * FROM COUNTRY_MASTER WHERE CURRENCY_NAME = '${userData.branch.info.CURRENCY_NAME}'`,
                  };

                  const currencyInfo = await callSoapService(userData.clientURL, "DataModel_GetDataFrom_Query", currencyDetailsPayload);
                  userData.currency.info = currencyInfo[0];
                }
              }

              const isAdminPayload = {
                UserName: clientEmpDetails[0]?.USER_NAME,
              };

              const isAdminResponse = await callSoapService(userData.clientURL, "DMS_Is_Admin_User", isAdminPayload);

              userData.user.isAdmin = isAdminResponse === "Yes";

              const payload = {
                userEmail: email,
                userName: clientEmpDetails[0]?.USER_NAME,
                userEmployeeNo: clientEmpDetails[0]?.EMP_NO,
                userAvatar: userData.user.employeeImage,
                clientURL: userData.clientURL,
                isAdmin: userData.user.isAdmin,
                companyName: userData.company.name,
                companyAddress: userData.branch.info?.ADDRESS_POSTAL,
                companyLogo: userData.company.logo,
                companyCurrName: userData.branch.info?.CURRENCY_NAME,
                companyCurrDecimals: userData.currency.info?.NO_OF_DECIMALS,
                companyCurrSymbol: userData.currency.info?.CURRENCY_CODE,
                companyCurrIsIndianStandard: userData.currency.info?.IS_INDIANCURRENCY_FORMAT,
              };

              login(payload, rememberMe);

              navigate("/");
            } else {
              setError(authenticationResponse);
            }
          } else {
            setError(clientDoConnectionResponse);
          }
        } else {
          setError(publicDoConnectionResponse);
        }
      } catch (err) {
        console.error("Login error:", err);
        setError("Login failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberMe, navigate, login],
  );

  return (
  <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
  {/* Background with subtle overlay */}
  {/* Background video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={istcloudsvideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>
 
  {/* Left Content - Branding */}
  <div className="w-full lg:w-1/2 relative z-10 flex flex-col justify-between text-white p-6 lg:p-8">
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 mt-16 lg:mt-0">
      {/* Overlaying logo for better visibility */}
      <div className="absolute top-8 lg:top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg">
        <img
          src={logoLight}
          alt="iStreams ERP Solutions | CRM"
          className="h-12 lg:h-16"
        />
      </div>
 
      <div className="text-center px-4 group mt-16 lg:mt-8">
        <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4 transition-transform duration-500 hover:scale-[1.02] hover:translate-x-1">
          Optimize Your Business Operations with{" "}
          <span className="text-teal-300 inline-block transition-all duration-500 group-hover:scale-105 group-hover:text-teal-200">
            Intelligent ERP Solutions
          </span>
        </h2>
        <p className="text-base lg:text-lg opacity-90 leading-relaxed transition-transform duration-300 hover:translate-y-1">
          iStreams ERP provides comprehensive tools to streamline your workflows,
          enhance customer relationships, and drive data-informed decision making.
        </p>
      </div>
    </div>
 
    <div className="text-white mt-8 lg:mt-0">
      <div className="flex items-center space-x-2">
        <div className="w-10 h-1 bg-teal-300 rounded-full animate-[progress-active_2s_ease-in-out_infinite]"></div>
        <div className="w-6 h-1 bg-teal-300 rounded-full opacity-50 animate-[progress-inactive_2s_ease-in-out_infinite_0.3s]"></div>
        <div className="w-4 h-1 bg-teal-300 rounded-full opacity-30 animate-[progress-inactive_2s_ease-in-out_infinite_0.6s]"></div>
      </div>
      <div className="mt-4 h-6 overflow-hidden relative">
        <div className="animate-[text-slide_12s_cubic-bezier(0.83,0,0.17,1)_infinite] space-y-2">
          <p className="text-sm font-light italic">
            "Innovation that drives success."
          </p>
          <p className="text-sm font-light italic">
            "Streamline your workflow effortlessly."
          </p>
          <p className="text-sm font-light italic">
            "Data-driven decisions for growth."
          </p>
          <p className="text-sm font-light italic">
            "Trusted by businesses worldwide to transform their operations"
          </p>
        </div>
      </div>
    </div>
 
    {/* Define animations using style tag */}
    <style jsx>{`
      @keyframes progress-active {
        0%,
        100% {
          transform: scaleX(1);
        }
        50% {
          transform: scaleX(0.8);
        }
      }
      @keyframes progress-inactive {
        0%,
        100% {
          transform: scaleX(1);
        }
        50% {
          transform: scaleX(0.6);
        }
      }
      @keyframes text-slide {
        0%,
        20% {
          transform: translateY(0);
        }
        25%,
        45% {
          transform: translateY(-25%);
        }
        50%,
        70% {
          transform: translateY(-50%);
        }
        75%,
        95% {
          transform: translateY(-75%);
        }
        100% {
          transform: translateY(-100%);
        }
      }
    `}</style>
  </div>
 
  {/* Right Content - Login Form */}
  <div className="w-full lg:w-1/2 relative z-10 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div className="w-full max-w-md bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 sm:p-8 shadow-2xl">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-300 text-sm sm:text-base">Please enter your credentials to continue</p>
      </div>
 
      <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
 
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="username@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-gray-400 transition-all text-sm sm:text-base"
                required
              />
            </div>
          </div>
 
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-gray-400 transition-all text-sm sm:text-base"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                )}
              </button>
            </div>
          </div>
        </div>
 
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-2 sm:py-3 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all text-sm sm:text-base"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  </div>
</div>
  );
};

export default LoginFormPage;