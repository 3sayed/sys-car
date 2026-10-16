<?php

// One-time local migration from the previous SQLite database to an empty
// MySQL schema created with `php artisan migrate`.
$sqliteFile = dirname(__DIR__).'/database/database.sqlite';
if (! is_file($sqliteFile) || getenv('DB_CONNECTION') !== 'mysql') {
    fwrite(STDERR, "Provide the old SQLite file and set DB_CONNECTION=mysql.\n");
    exit(1);
}

$source = new PDO('sqlite:'.$sqliteFile, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$target = new PDO(sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    getenv('DB_HOST') ?: '127.0.0.1',
    getenv('DB_PORT') ?: '3306',
    getenv('DB_DATABASE') ?: 'inficarx',
), getenv('DB_USERNAME') ?: 'root', getenv('DB_PASSWORD') ?: '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$tables = $source->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    ->fetchAll(PDO::FETCH_COLUMN);
$targetTables = $target->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$quote = static fn (string $name): string => '`'.str_replace('`', '``', $name).'`';

foreach ($tables as $table) {
    if (! in_array($table, $targetTables, true)) {
        throw new RuntimeException("Missing MySQL table: {$table}");
    }
    if ($table !== 'migrations' && (int) $target->query('SELECT COUNT(*) FROM '.$quote($table))->fetchColumn() !== 0) {
        throw new RuntimeException("MySQL table {$table} already has data; import requires an empty destination.");
    }
}

$target->exec('SET FOREIGN_KEY_CHECKS=0');
try {
    $target->beginTransaction();
    foreach ($tables as $table) {
        if ($table === 'migrations') continue;
        $columns = array_column($source->query('PRAGMA table_info('.$quote($table).')')->fetchAll(PDO::FETCH_ASSOC), 'name');
        if (! $columns) continue;
        $statement = $target->prepare('INSERT INTO '.$quote($table).' ('.implode(',', array_map($quote, $columns)).') VALUES ('.implode(',', array_fill(0, count($columns), '?')).')');
        $count = 0;
        foreach ($source->query('SELECT * FROM '.$quote($table), PDO::FETCH_ASSOC) as $row) {
            $statement->execute(array_values($row));
            $count++;
        }
        echo $table.'='.$count.PHP_EOL;
    }
    $target->commit();
} catch (Throwable $error) {
    if ($target->inTransaction()) $target->rollBack();
    throw $error;
} finally {
    $target->exec('SET FOREIGN_KEY_CHECKS=1');
}

foreach ($tables as $table) {
    if ($table === 'migrations') continue;
    $old = (int) $source->query('SELECT COUNT(*) FROM '.$quote($table))->fetchColumn();
    $new = (int) $target->query('SELECT COUNT(*) FROM '.$quote($table))->fetchColumn();
    if ($old !== $new) throw new RuntimeException("Count mismatch in {$table}: SQLite {$old}, MySQL {$new}");
}
echo "All table counts match. SQLite source was left unchanged.\n";
