// components/PageLoader.jsx
import { useLoading } from "./LoadingContext";
import "./PageLoader.css"; // สไตล์สำหรับ PageLoader
export default function PageLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg px-6 py-4 shadow-lg text-center text-lg font-medium animate-pulse">
        ⏳ กรุณารอสักครู่...
      </div>
    </div>
  );
}
