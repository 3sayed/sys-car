<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    protected $signature = 'marketplace:admin {email}';

    protected $description = 'Initialize system roles and create an administrator interactively';

    public function handle(): int
    {
        $data = ['email' => $this->argument('email'), 'name' => $this->ask('Administrator name'), 'password' => $this->secret('Password (at least 12 characters)')];
        $v = Validator::make($data, ['email' => 'required|email|unique:users,email', 'name' => 'required|string|max:100', 'password' => 'required|string|min:12']);
        if ($v->fails()) {
            foreach ($v->errors()->all() as $error) {
                $this->error($error);
            }

return self::FAILURE;
        }
        DB::transaction(function () use ($data) {
            foreach (['customer', 'supplier', 'admin'] as $role) {
                DB::table('roles')->insertOrIgnore(['name' => $role, 'created_at' => now(), 'updated_at' => now()]);
            }
            $u = User::create($data);
            DB::table('user_roles')->insert(['user_id' => $u->id, 'role_id' => DB::table('roles')->where('name', 'admin')->value('id'), 'created_at' => now(), 'updated_at' => now()]);
        });
        $this->info('Administrator created.');

        return self::SUCCESS;
    }
}
