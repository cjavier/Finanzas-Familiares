Modelo de Datos — PostgreSQL

1. teams

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único del equipo
name	VARCHAR	Nombre del equipo/familia
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

2. users

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único del usuario
team_id	UUID (FK)	Relación con equipos
name	VARCHAR	Nombre
email	VARCHAR	Correo único
password_hash	VARCHAR	Contraseña hasheada
role	VARCHAR	‘admin’ / ‘member’
is_active	BOOLEAN	Usuario activo o no
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

3. categories

Campo	Tipo	Descripción
id	UUID (PK)	Identificador de la categoría
team_id	UUID (FK)	Relación con equipos
name	VARCHAR	Nombre de la categoría
icon	VARCHAR	Nombre o código del ícono
color	VARCHAR	Código hexadecimal o nombre de color
is_active	BOOLEAN	Si está activa
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

4. budgets

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único
team_id	UUID (FK)	Relación con equipos
category_id	UUID (FK)	Relación con categoría
amount	DECIMAL	Monto del presupuesto
period	VARCHAR	‘monthly’, ‘weekly’, ‘biweekly’, ‘custom’
start_date	DATE	Fecha de inicio del presupuesto
end_date	DATE	Fecha final (nullable)
is_active	BOOLEAN	Si está activo
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

5. transactions

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único
team_id	UUID (FK)	Relación con equipo
user_id	UUID (FK)	Usuario que registró la transacción
category_id	UUID (FK)	Categoría asignada
amount	DECIMAL	Monto
description	VARCHAR	Descripción breve
date	DATE	Fecha de la transacción
source	VARCHAR	‘manual’, ‘statement’, ‘ticket’, ‘ocr’
status	VARCHAR	‘active’, ‘deleted’, ‘pending’
file_id	UUID (FK)	Archivo relacionado (nullable)
is_ai_suggested	BOOLEAN	Si la categoría fue sugerida por IA
ai_confidence	DECIMAL	Confianza de la IA (nullable)
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

6. files

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único
team_id	UUID (FK)	Relación con equipo
user_id	UUID (FK)	Usuario que subió el archivo
file_type	VARCHAR	‘pdf’, ‘excel’, ‘image’, ‘other’
file_path	VARCHAR	Ubicación del archivo
original_name	VARCHAR	Nombre original del archivo
status	VARCHAR	‘processing’, ‘processed’, ‘error’
processed_at	TIMESTAMP	Fecha de procesamiento (nullable)
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

7. rules

Campo	Tipo	Descripción
id	UUID (PK)	Identificador de la regla
team_id	UUID (FK)	Relación con equipo
name	VARCHAR	Nombre de la regla
match_text	VARCHAR	Texto a buscar en la descripción
field	VARCHAR	‘description’, ‘amount’, ‘date’
category_id	UUID (FK)	Categoría a asignar si coincide la regla
is_active	BOOLEAN	Si la regla está activa
created_at	TIMESTAMP	Fecha de creación
updated_at	TIMESTAMP	Última actualización

8. notifications

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único
team_id	UUID (FK)	Relación con equipo
user_id	UUID (FK)	Usuario receptor (nullable)
title	VARCHAR	Título
body	VARCHAR	Cuerpo del mensaje
type	VARCHAR	‘alert’, ‘info’, ‘reminder’
is_read	BOOLEAN	Leída o no
created_at	TIMESTAMP	Fecha de creación
read_at	TIMESTAMP	Fecha de lectura (nullable)
related_transaction_id	UUID (FK)	Transacción relacionada (nullable)
related_category_id	UUID (FK)	Categoría relacionada (nullable)

9. transaction_audit_log

Campo	Tipo	Descripción
id	UUID (PK)	Identificador único
transaction_id	UUID (FK)	Transacción relacionada
user_id	UUID (FK)	Usuario que hizo el cambio
change_type	VARCHAR	‘created’, ‘updated’, ‘deleted’, ‘category_changed’
old_value	JSONB	Valor previo
new_value	JSONB	Nuevo valor
changed_at	TIMESTAMP	Fecha del cambio


⸻

Relaciones Principales
	•	team tiene muchos: users, categories, budgets, files, transactions, rules, notifications
	•	user pertenece a team; tiene muchos: transactions, files, notifications, transaction_audit_log
	•	category pertenece a team; tiene muchos: transactions, budgets, rules, notifications
	•	budget liga un team y una category
	•	transaction liga a team, user, category, file (opcional)
	•	file puede originar varias transactions
	•	rule pertenece a team y a category
	•	notification puede relacionarse con user, category o transaction
	•	transaction_audit_log audita cambios en transactions

⸻

Notas de Implementación
	•	En enums (role, status, period, etc.) usa campos VARCHAR o tablas lookup si necesitas más flexibilidad.
	•	Todos los campos de relación y PK/FK son UUID.
	•	Todas las tablas llevan created_at y updated_at.
	•	Considera índices en: team_id, category_id, user_id, date para mejorar el rendimiento.
	•	Para íconos puedes usar nombres estándar de librerías (ej. Material Icons).
