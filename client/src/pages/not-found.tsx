import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/providers/language-provider";

export default function NotFound() {
  const { language } = useLanguage();

  const copy =
    language === "zh"
      ? {
          title: "404 页面未找到",
          message: "可能是页面已被移除，或者链接有误。",
        }
      : {
          title: "404 Page Not Found",
          message: "The page you're looking for might have been removed or the link is incorrect.",
        };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="absolute right-6 top-6">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">{copy.message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
