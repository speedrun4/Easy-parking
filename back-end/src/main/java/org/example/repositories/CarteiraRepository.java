package org.example.repositories;


import org.example.models.Carteira;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CarteiraRepository extends JpaRepository<Carteira, Long> {
}