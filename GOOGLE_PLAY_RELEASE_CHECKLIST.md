# Checklist final de publicacion en Google Play

## A. Preparacion tecnica

- [ ] Ejecutar `npm run cap:sync`
- [ ] Abrir Android Studio con `npm run android:open`
- [ ] Confirmar `applicationId` definitivo en `android/app/build.gradle`
- [ ] Verificar `android/local.properties` con `sdk.dir` correcto
- [ ] Incrementar `versionCode` para esta subida
- [ ] Definir `versionName` visible para usuarios
- [ ] Compilar `Android App Bundle (AAB)` firmado
- [ ] Confirmar build release con R8/ProGuard (minify + shrinkResources)

### Firma por consola (opcional y recomendado)

- [ ] Ejecutar `npm run android:signing:setup`
- [ ] Guardar el archivo `.jks` en una ruta segura fuera del repositorio
- [ ] Ejecutar `npm run android:release:signed` para generar `bundleRelease`

## B. Calidad antes de enviar

- [ ] Probar instalacion en dispositivo real
- [ ] Validar flujo completo: pedir, plantarse, doblar, dividir, reiniciar
- [ ] Verificar sonido on/off y volumen
- [ ] Validar persistencia de estado al cerrar y abrir app
- [ ] Revisar UI en telefonos pequenos y pantallas grandes
- [ ] Confirmar que no hay cierres inesperados
- [ ] Verificar que la build optimizada (R8) no rompe funcionalidades en dispositivo real

## C. Play Console

- [ ] Completar nombre y descripcion de la app
- [ ] Cargar icono, capturas y graphic asset
- [ ] Completar `Data safety`
- [ ] Completar `Content rating`
- [ ] Adjuntar politica de privacidad publica
- [ ] Definir precio o modelo de monetizacion
- [ ] Seleccionar paises de distribucion

## D. Legal y contenido

- [ ] Declarar que el juego usa saldo virtual (sin dinero real)
- [ ] Asegurar que no hay retiros ni premios canjeables
- [ ] Revisar cumplimiento de politicas de juegos de azar por pais

## E. Lanzamiento

- [ ] Subir AAB al track interno
- [ ] Probar release interno/cerrado
- [ ] Corregir observaciones
- [ ] Enviar a produccion

## F. Post-lanzamiento

- [ ] Monitorear Android Vitals (ANR/crash)
- [ ] Revisar rating y comentarios
- [ ] Preparar version `1.0.1` con mejoras de onboarding
