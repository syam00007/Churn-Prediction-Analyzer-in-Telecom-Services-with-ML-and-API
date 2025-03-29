"use client";
import { useState } from "react";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

const formFields = [
  // Personal Information
  { name: "gender", label: "Gender", options: ["Male", "Female"], required: true },
  { name: "SeniorCitizen", label: "Senior Citizen", options: ["Yes", "No"], required: true },
  { name: "Partner", label: "Partner", options: ["Yes", "No"], required: true },
  { name: "Dependents", label: "Dependents", options: ["Yes", "No"], required: true },

  // Service Information
  { name: "PhoneService", label: "Phone Service", options: ["Yes", "No"], required: true },
  { name: "MultipleLines", label: "Multiple Lines", options: ["Yes", "No", "No phone service"] },
  { name: "InternetService", label: "Internet Service", options: ["DSL", "Fiber optic", "No"], required: true },
  { name: "OnlineSecurity", label: "Online Security", options: ["Yes", "No", "No internet service"] },
  { name: "OnlineBackup", label: "Online Backup", options: ["Yes", "No", "No internet service"] },
  { name: "DeviceProtection", label: "Device Protection", options: ["Yes", "No", "No internet service"] },
  { name: "TechSupport", label: "Tech Support", options: ["Yes", "No", "No internet service"] },
  { name: "StreamingTV", label: "Streaming TV", options: ["Yes", "No", "No internet service"] },
  { name: "StreamingMovies", label: "Streaming Movies", options: ["Yes", "No", "No internet service"] },

  // Contract & Billing
  { name: "Contract", label: "Contract", options: ["Month-to-month", "One year", "Two year"], required: true },
  { name: "PaperlessBilling", label: "Paperless Billing", options: ["Yes", "No"], required: true },
  {
    name: "PaymentMethod",
    label: "Payment Method",
    options: [
      "Electronic check",
      "Mailed check",
      "Bank transfer (automatic)",
      "Credit card (automatic)"
    ],
    required: true,
  },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    SeniorCitizen: "",
    MonthlyCharges: "",
    TotalCharges: "",
    gender: "",
    Partner: "",
    Dependents: "",
    PhoneService: "",
    MultipleLines: "",
    InternetService: "",
    OnlineSecurity: "",
    OnlineBackup: "",
    DeviceProtection: "",
    TechSupport: "",
    StreamingTV: "",
    StreamingMovies: "",
    Contract: "",
    PaperlessBilling: "",
    PaymentMethod: "",
    tenure: "",
  });

  const validateField = (name, value) => {
    let error = "";
    const fieldDefinition = formFields.find((field) => field.name === name);
    if (fieldDefinition && fieldDefinition.required && !value) {
      error = "This field is required";
    }
    if (["MonthlyCharges", "TotalCharges", "tenure"].includes(name)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        error = "Invalid number";
      }
    }
    return error;
  };

  const handleInputChange = (name, value) => {
    const error = validateField(name, value);
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;
    formFields.forEach((field) => {
      const error = validateField(field.name, formData[field.name]);
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    });
    ["MonthlyCharges", "TotalCharges", "tenure"].forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });
    setValidationErrors(errors);
    return isValid;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const payload = {
        ...formData,
        SeniorCitizen: formData.SeniorCitizen === "Yes" ? 1 : 0,
        MonthlyCharges: parseFloat(formData.MonthlyCharges),
        TotalCharges: parseFloat(formData.TotalCharges),
        tenure: parseInt(formData.tenure, 10),
      };

      const response = await axios.post(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860/predict",
        payload
      );
      setPredictionResult({
        message: response.data.prediction,
        confidence: response.data.confidence,
        status: "success",
      });
    } catch (error) {
      setPredictionResult({
        message: error.response?.data?.detail || "Prediction failed",
        confidence: "0%",
        status: "error",
      });
    } finally {
      setLoading(false);
      setDialogOpen(true);
    }
  };

  const resetForm = () => {
    setFormData({
      SeniorCitizen: "",
      MonthlyCharges: "",
      TotalCharges: "",
      gender: "",
      Partner: "",
      Dependents: "",
      PhoneService: "",
      MultipleLines: "",
      InternetService: "",
      OnlineSecurity: "",
      OnlineBackup: "",
      DeviceProtection: "",
      TechSupport: "",
      StreamingTV: "",
      StreamingMovies: "",
      Contract: "",
      PaperlessBilling: "",
      PaymentMethod: "",
      tenure: "",
    });
    setValidationErrors({});
    setPredictionResult(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-800">
            Churn Prediction Analyzer <span className="ml-2">📈</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Predict customer churn probability with machine learning
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label>
                {field.label}
                {field.required && " *"}
              </Label>
              <Select
                value={formData[field.name]}
                onValueChange={(value) => handleInputChange(field.name, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {validationErrors[field.name] && (
                <p className="text-red-500 text-sm">{validationErrors[field.name]}</p>
              )}
            </div>
          ))}

          {/* Numeric Inputs */}
          <div className="space-y-2">
            <Label>Monthly Charges ($) *</Label>
            <Input
              type="number"
              value={formData.MonthlyCharges}
              onChange={(e) => handleInputChange("MonthlyCharges", e.target.value)}
              placeholder="Enter monthly charges"
              step="0.01"
            />
            {validationErrors.MonthlyCharges && (
              <p className="text-red-500 text-sm">{validationErrors.MonthlyCharges}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Total Charges ($) *</Label>
            <Input
              type="number"
              value={formData.TotalCharges}
              onChange={(e) => handleInputChange("TotalCharges", e.target.value)}
              placeholder="Enter total charges"
              step="0.01"
            />
            {validationErrors.TotalCharges && (
              <p className="text-red-500 text-sm">{validationErrors.TotalCharges}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tenure (months) *</Label>
            <Input
              type="number"
              value={formData.tenure}
              onChange={(e) => handleInputChange("tenure", e.target.value)}
              placeholder="Enter tenure in months"
              min="0"
            />
            {validationErrors.tenure && (
              <p className="text-red-500 text-sm">{validationErrors.tenure}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-4 border-t pt-4">
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Reset Form
          </Button>
          <Button onClick={handleFormSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Predict Churn Risk"
            )}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={predictionResult?.status === "error" ? "text-red-600" : "text-green-600"}
            >
              {predictionResult?.status === "error" ? "Prediction Error" : "Prediction Result"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p
                  className={`text-lg font-semibold ${
                    predictionResult?.status === "error" ? "text-red-500" : "text-gray-700"
                  }`}
                >
                  {predictionResult?.message}
                </p>
                {predictionResult?.confidence && (
                  <p className="text-gray-600">Confidence: {predictionResult.confidence}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialogOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
