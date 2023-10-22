// Settings Context - src/context/Settings
import React, { useState } from "react";

const SettingsContext = React.createContext();

const defaultSettings = {
  theme: "light",
  type: "UNI",
  editor: true,
  lock: false
};

export const SettingsProvider = ({ children, settings }) => {
  const [currentSettings, setCurrentSettings] = useState(
    settings || defaultSettings
  );

  const saveSettings = (values) => {
   setCurrentSettings(values)
  };

  return (
    <SettingsContext.Provider
      value={{ settings: currentSettings, saveSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const SettingsConsumer = SettingsContext.Consumer;

export default SettingsContext;