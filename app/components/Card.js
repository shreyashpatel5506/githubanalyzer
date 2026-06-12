var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export function Card(_a) {
    var { children, className = "", hover = false } = _a, props = __rest(_a, ["children", "className", "hover"]);
    return (_jsx("div", Object.assign({ className: `
        bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
        shadow-sm transition-all duration-200
        ${hover ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600' : ''}
        ${className}
      ` }, props, { children: children })));
}
export function CardHeader({ children, className = "" }) {
    return (_jsx("div", { className: `px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`, children: children }));
}
export function CardContent({ children, className = "" }) {
    return (_jsx("div", { className: `px-6 py-4 ${className}`, children: children }));
}
export function CardTitle({ children, className = "" }) {
    return (_jsx("h3", { className: `text-lg font-semibold text-gray-900 dark:text-white ${className}`, children: children }));
}
export function CardDescription({ children, className = "" }) {
    return (_jsx("p", { className: `text-sm text-gray-600 dark:text-gray-400 ${className}`, children: children }));
}
