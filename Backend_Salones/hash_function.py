import bcrypt

def hasheo(contrasena):
    contrasena_bytes = contrasena.encode('utf-8')
    salt = bcrypt.gensalt()
    contrasena_hasheada = bcrypt.hashpw(contrasena_bytes, salt)

    return contrasena_hasheada.decode('utf-8')

def verificar_contrasena(contrasena, contrasena_hasheada):
    contrasena_bytes = contrasena.encode('utf-8')
    contrasena_hasheada_bytes = contrasena_hasheada.encode('utf-8')

    return bcrypt.checkpw(contrasena_bytes, contrasena_hasheada_bytes)


if __name__ == "__main__":

    test_password = "contraseña_segura"
    hashed = hasheo(test_password)
    print(f"Contraseña original: {test_password}")
    print(f"Contraseña hasheada: {hashed}")

    is_valid = verificar_contrasena(test_password, hashed)
    print(f"Verificación exitosa: {is_valid}")

    is_invalid = verificar_contrasena("contraseña_incorrecta", hashed)
    print(f"Verificación fallida: {is_invalid}")