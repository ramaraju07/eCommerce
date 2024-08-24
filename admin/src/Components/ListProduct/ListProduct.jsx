import React, { useEffect, useState } from 'react';
import "./Listproduct.css";
import cross_icon from '../../assets/cross_icon.png';

const Listproduct = () => {
    const [allproducts, setAllproducts] = useState([]);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3000/allproducts');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setAllproducts(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const deleteProduct = async (productId) => {
        try {
            const response = await fetch("http://localhost:3000/removeproduct", {
                method: "POST",
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: productId }),
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || 'Product removed successfully');
            } else {
                alert(data.message || 'Failed to remove product');
            }
            fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error occurred while deleting product');
        }
    };

    return (
        <div className='list-product'>
            <h1>All Products List</h1>
            <div className="listproduct-format-main">
                <p>Products</p>
                <p>Title</p>
                <p>Old Price</p>
                <p>New Price</p>
                <p>Category</p>
                <p>Remove</p>
            </div>
            <div className="listproduct-allproducts">
                <hr />
                {allproducts.map((product) => (
                    <div key={product.id} className="listproduct-format-main">
                        <img className='list-product-icon' src={product.image} alt={product.name} />
                        <p>{product.name}</p>
                        <p>${product.old_price}</p>
                        <p>${product.new_price}</p>
                        <p>{product.category}</p>
                        <img onClick={() => deleteProduct(product.id)} className='list-product-remove' src={cross_icon} alt="Remove" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Listproduct;
