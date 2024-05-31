import React, { createContext, useContext, useState, ReactNode } from "react";

interface FormData {
  servername: string;
  protocol: string;
  url: string;
  method: string;
  isSwitchSSLOn: boolean;
  isSwitchDomainOn: boolean;
  chips: ChipData[];
  qualite: string;
  update: string;
}

interface ChipData {
  label: string;
  color: string;
}

interface FormContextType {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error(
      "useFormContext doit être utilisé à l'intérieur de FormProvider"
    );
  }
  return context;
};

export const FormProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [formData, setFormData] = useState<FormData>({
    servername: "",
    protocol: "https://",
    url: "",
    method: "",
    isSwitchSSLOn: false,
    isSwitchDomainOn: false,
    chips: [],
    qualite: "",
    update: "",
  });

  const contextValue = { formData, setFormData };

  return (
    <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>
  );
};
