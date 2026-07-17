"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import styles from "./page.module.css";

const DEMO_NOTICE = "演示界面，尚未接入登录服务";
const mainlandPhonePattern = /^1\d{10}$/;
const verificationCodePattern = /^\d{6}$/;

function validatePhone(phone: string) {
  if (!phone.trim()) return "请输入手机号";
  if (!mainlandPhonePattern.test(phone.trim())) return "请输入 11 位大陆手机号";
  return "";
}

function validateCode(code: string) {
  if (!code.trim()) return "请输入验证码";
  if (!verificationCodePattern.test(code.trim())) return "请输入 6 位数字验证码";
  return "";
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [notice, setNotice] = useState(DEMO_NOTICE);

  const validateForm = () => {
    const nextPhoneError = validatePhone(phone);
    const nextCodeError = validateCode(code);

    setPhoneError(nextPhoneError);
    setCodeError(nextCodeError);
    return !nextPhoneError && !nextCodeError;
  };

  const handleRequestCode = () => {
    const nextPhoneError = validatePhone(phone);
    setPhoneError(nextPhoneError);

    if (!nextPhoneError) setNotice(DEMO_NOTICE);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validateForm()) setNotice(DEMO_NOTICE);
  };

  return (
    <main className={styles.page}>
      <div className={styles.starfield} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink}>
          <ArrowLeft aria-hidden="true" />
          回到首页
        </Link>
      </header>

      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brandLockup} aria-label="粒子">
          <ConstellationLogo className={styles.logo} />
          <span>粒子</span>
        </div>

        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <Sparkles aria-hidden="true" />
            PERSONAL TAROT ARCHIVE
          </p>
          <h1 id="login-title">登录你的牌面记录</h1>
          <p>留下入口的位置。登录服务准备好之前，这里只展示完整的界面交互。</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="login-phone">手机号</label>
            <input
              id="login-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              value={phone}
              placeholder="请输入 11 位手机号"
              aria-invalid={Boolean(phoneError)}
              aria-describedby="login-phone-help login-phone-error"
              onChange={(event) => {
                const nextPhone = event.target.value.replace(/\D/g, "");
                setPhone(nextPhone);
                if (phoneError) setPhoneError(validatePhone(nextPhone));
              }}
            />
            <p id="login-phone-help" className={styles.helpText}>仅用于演示字段校验，不会保存或发送。</p>
            <p id="login-phone-error" className={styles.fieldError} aria-live="polite">
              {phoneError}
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="login-code">验证码</label>
            <div className={styles.codeRow}>
              <input
                id="login-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                placeholder="6 位数字"
                aria-invalid={Boolean(codeError)}
                aria-describedby="login-code-error"
                onChange={(event) => {
                  const nextCode = event.target.value.replace(/\D/g, "");
                  setCode(nextCode);
                  if (codeError) setCodeError(validateCode(nextCode));
                }}
              />
              <button type="button" className={styles.codeButton} onClick={handleRequestCode}>
                获取验证码
              </button>
            </div>
            <p id="login-code-error" className={styles.fieldError} aria-live="polite">
              {codeError}
            </p>
          </div>

          <button type="submit" className={styles.submitButton}>登录</button>
          <p className={styles.notice} role="status" aria-live="polite">{notice}</p>
        </form>
      </section>
    </main>
  );
}
