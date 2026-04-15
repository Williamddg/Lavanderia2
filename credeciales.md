SISTETECNI-TEST-005

mac:
    mysql
        root
        ""

        lavapp_local
        Lavanderia2026


Windows:

    mysql
        root
        williamddg

    App
        admin
            adminlavanderia
            Lavanda2026.

        supervisor
            supervisor123  
            Supersupervisor2026.

        operador
            operator
            Ooperador123.



=============== PRUEBAS ADMIN ==============
Clientes
    limpiar campos al crear cliente
    no repertir numeros de telefono ni correos de clientes
    quitar "Alta rápida con validaciones básicas." en clientes
    limitar caracteres notas
    pedir documento (opcional) al crear cliente

Inventario
    ordenar inventario inactivos al final
    alerta al colocar valores negativos
    manejar un solo tipo (decimales en editar y enteros en ppal)
    alerta al usar . se borra el valor
    si esta inactivo cambiar boton desactivar a activar
    no manenar decimales (falla al facturar)

Ordenes
    guardar borrador si se sale
    descuento y abono despues del total
    cantidad solo enteros
    motivos de recargo
    revisar calculo subtotal (falla con 1 item)
            falla por decimales: "[ { "code": "invalid_type", "expected": "number", "received": "nan", "path": [ "items", 0, "discountAmount" ], "message": "Expected number, received nan" } ]"
    verificar cajon de busqueda ppal y de serv
    no poder modificar precios desde alli
        ordenar botones en ver
    limitar caracteres obs
    no lanzar resumen de orden sino listado de ordenes (permite crear mas)
    no dejar por defecto valor total en registrar pago (es abono)
    revisar carga de factura
    quitar "Listado comercial con acciones rápidas sobre cada orden." y "Buscador global, accesos rápidos y estado comercial del escritorio."
    contemplar devolucion de dinero al cancelar
    al confirmar cargar telefono del cliente
    notificar entrega por whats
    ordenar por estados
    no poder devolver estados

Facturacion
    No factura ninguna orden en ningun estado
Gastos
    no hay categorias
    no hay manejo de categorias

Garantias
    no deja crear "No existe el estado OPEN en warranty_statuses."

Caja
    no permitir editar mensjae de cierre (enviar directamente)
    guardar ultimas 3 aperturas diferentes para seleccioanar preguardadas


Reportes
    inlcuir garantias
    cambiar "pagos registrados" a "abonos realizados"
    estados de ordenes?
    permitir exportar en pdf y enviar por whats

Auditoria?




VISTA DE OPERADOR
    ocultar inventario, reportes, conf, auditoria

Solo rol de admin entra a conf

quitar "Buscador global, accesos rápidos y estado comercial del escritorio."

para que email de clientes?

en login un boton de cerrar app