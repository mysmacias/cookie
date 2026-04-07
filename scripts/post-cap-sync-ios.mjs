/**
 * Capacitor `cap sync ios` rewrites ios/App/CapApp-SPM/Package.swift with
 * swift-tools-version 5.9 and platforms: [.iOS(.v26)], but .v26 requires PackageDescription 6.2.
 * Normalize to .iOS("26.0") so the aggregate package resolves under tools 5.9.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url).pathname;
let text = readFileSync(path, 'utf8');
const original = text;
text = text.replace(/platforms:\s*\[\s*\.iOS\(\.v26\)\s*\]/, 'platforms: [.iOS("26.0")]');
if (text !== original) {
  writeFileSync(path, text);
  console.log('post-cap-sync-ios: fixed CapApp-SPM Package.swift iOS platform for swift-tools 5.9');
}
